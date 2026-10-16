package handler

import (
	"bytes"
	"context"
	"crypto/aes"
	"crypto/cipher"
	"crypto/rand"
	"crypto/rsa"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"net/http/httptest"
	"os"
	"sync/atomic"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/redis/go-redis/v9"
)

func TestPasswordTransport(t *testing.T) {
	address := os.Getenv("BLOG_TEST_REDIS")
	if address == "" {
		t.Skip("set BLOG_TEST_REDIS to run Redis integration check")
	}
	client := redis.NewClient(&redis.Options{Addr: address})
	t.Cleanup(func() { _ = client.Close() })
	transport, err := NewPasswordTransport(client)
	if err != nil {
		t.Fatal(err)
	}
	gin.SetMode(gin.TestMode)
	router := gin.New()
	var calls atomic.Int32
	const path = "/api/v1/auth/login"
	router.POST(path, transport.RequireEncrypted, func(c *gin.Context) {
		var body map[string]string
		if err := c.ShouldBindJSON(&body); err != nil {
			t.Error(err)
		}
		if body["password"] != "中文-password-123" {
			t.Error("plaintext not recovered")
		}
		calls.Add(1)
		encryptedPasswordResponse(c, "new-secret")
	})
	makeBody := func(aadPath string, issuedAt int64) (PasswordEnvelope, []byte) {
		key := make([]byte, 32)
		rand.Read(key)
		hash := sha256.Sum256(key)
		t.Cleanup(func() { client.Del(context.Background(), "password:used:"+hex.EncodeToString(hash[:])) })
		block, _ := aes.NewCipher(key)
		gcm, _ := cipher.NewGCM(block)
		iv := make([]byte, 12)
		rand.Read(iv)
		body := []byte(fmt.Sprintf(`{"issuedAt":%d,"data":{"password":"中文-password-123"}}`, issuedAt))
		encrypted := gcm.Seal(nil, iv, body, passwordAAD(aadPath))
		wrapped, err := rsa.EncryptOAEP(sha256.New(), rand.Reader, &transport.private.PublicKey, key, nil)
		if err != nil {
			t.Fatal(err)
		}
		return PasswordEnvelope{1, transport.keyID, base64.StdEncoding.EncodeToString(wrapped), base64.StdEncoding.EncodeToString(iv), base64.StdEncoding.EncodeToString(encrypted)}, key
	}
	send := func(body any, origin string) *httptest.ResponseRecorder {
		raw, _ := json.Marshal(body)
		req := httptest.NewRequest("POST", "https://blog.test"+path, bytes.NewReader(raw))
		req.Header.Set("Content-Type", "application/json")
		req.Header.Set("Origin", origin)
		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)
		return w
	}
	body, key := makeBody(path, time.Now().Unix())
	response := send(body, "https://blog.test")
	if response.Code != 200 {
		t.Fatalf("valid status: %d %s", response.Code, response.Body.String())
	}
	if bytes.Contains(response.Body.Bytes(), []byte("new-secret")) {
		t.Fatal("plaintext response")
	}
	var result struct{ IV, Data string }
	json.Unmarshal(response.Body.Bytes(), &result)
	iv, _ := base64.StdEncoding.DecodeString(result.IV)
	encrypted, _ := base64.StdEncoding.DecodeString(result.Data)
	block, _ := aes.NewCipher(key)
	gcm, _ := cipher.NewGCM(block)
	decoded, err := gcm.Open(nil, iv, encrypted, append([]byte("response\n"), passwordAAD(path)...))
	if err != nil || !bytes.Contains(decoded, []byte("new-secret")) {
		t.Fatalf("response decryption: %v", err)
	}
	if send(body, "https://blog.test").Code != 400 {
		t.Fatal("replay accepted")
	}
	cases := []struct {
		name   string
		mutate func(*PasswordEnvelope)
		path   string
		age    int64
		status int
	}{
		{"expired", func(*PasswordEnvelope) {}, path, -121, 400},
		{"future", func(*PasswordEnvelope) {}, path, 60, 400},
		{"wrong-path", func(*PasswordEnvelope) {}, "/api/v1/admin/auth/login", 0, 400},
		{"wrong-version", func(e *PasswordEnvelope) { e.Version = 2 }, path, 0, 400},
		{"stale-key", func(e *PasswordEnvelope) { e.KeyID = "old" }, path, 0, 409},
		{"bad-iv", func(e *PasswordEnvelope) { e.IV = "AA==" }, path, 0, 400},
		{"tampered", func(e *PasswordEnvelope) {
			raw, _ := base64.StdEncoding.DecodeString(e.Data)
			raw[0] ^= 1
			e.Data = base64.StdEncoding.EncodeToString(raw)
		}, path, 0, 400},
		{"invalid-base64", func(e *PasswordEnvelope) { e.WrappedKey = "!" }, path, 0, 400},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			body, _ := makeBody(tc.path, time.Now().Unix()+tc.age)
			tc.mutate(&body)
			if got := send(body, "https://blog.test").Code; got != tc.status {
				t.Fatalf("got %d", got)
			}
		})
	}
	if send(map[string]string{"password": "plaintext"}, "https://blog.test").Code != 400 {
		t.Fatal("plaintext accepted")
	}
	body, _ = makeBody(path, time.Now().Unix())
	if send(body, "https://evil.test").Code != 403 {
		t.Fatal("cross origin accepted")
	}
	// 并发复制同一个密文请求，只允许一个进入业务处理器。
	results := make(chan int, 2)
	for range 2 {
		go func() { results <- send(body, "https://blog.test").Code }()
	}
	a, b := <-results, <-results
	if !((a == 200 && b == 400) || (a == 400 && b == 200)) {
		t.Fatalf("concurrent replay: %d %d", a, b)
	}
	if calls.Load() != 2 {
		t.Fatalf("invalid requests reached business: %d", calls.Load())
	}
}
