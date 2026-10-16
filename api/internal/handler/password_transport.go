package handler

import (
	"bytes"
	"crypto/aes"
	"crypto/cipher"
	"crypto/rand"
	"crypto/rsa"
	"crypto/sha256"
	"crypto/x509"
	"encoding/base64"
	"encoding/hex"
	"encoding/json"
	"io"
	"net/http"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/redis/go-redis/v9"
)

// PasswordEnvelope 是密码相关接口唯一接受的请求格式；业务 JSON 在 data 中加密。
type PasswordEnvelope struct {
	Version    int    `json:"version" binding:"required"`
	KeyID      string `json:"keyId" binding:"required"`
	WrappedKey string `json:"wrappedKey" binding:"required"`
	IV         string `json:"iv" binding:"required"`
	Data       string `json:"data" binding:"required"`
}

type PasswordTransport struct {
	private *rsa.PrivateKey
	public  string
	keyID   string
	redis   *redis.Client
}

// shortcut: 当前单 API 实例使用进程密钥；扩展多实例时需共享密钥管理或会话路由。
func NewPasswordTransport(client *redis.Client) (*PasswordTransport, error) {
	private, err := rsa.GenerateKey(rand.Reader, 2048)
	if err != nil {
		return nil, err
	}
	public, err := x509.MarshalPKIXPublicKey(&private.PublicKey)
	if err != nil {
		return nil, err
	}
	id := sha256.Sum256(public)
	return &PasswordTransport{private: private, public: base64.StdEncoding.EncodeToString(public), keyID: hex.EncodeToString(id[:]), redis: client}, nil
}

// PublicKey godoc
// @Summary 获取密码请求加密公钥
// @Description SPKI Base64 公钥；RSA-OAEP SHA-256 包装 AES-256-GCM 密钥。详见 README 密码请求加密。
// @Tags 前台认证
// @Produce json
// @Success 200 {object} map[string]interface{}
// @Router /auth/encryption-key [get]
func (t *PasswordTransport) PublicKey(c *gin.Context) {
	c.Header("Cache-Control", "no-store")
	c.JSON(http.StatusOK, gin.H{"keyId": t.keyID, "publicKey": t.public, "issuedAt": time.Now().Unix()})
}

func passwordAAD(path string) []byte { return []byte("blog-password:v1\nPOST\n" + path) }

func (t *PasswordTransport) RequireEncrypted(c *gin.Context) {
	c.Header("Cache-Control", "no-store")
	if !secureSameOrigin(c) {
		c.Abort()
		return
	}
	reject := func() {
		c.AbortWithStatusJSON(http.StatusBadRequest, gin.H{"error": "密码请求无效或已过期，请重新提交"})
	}
	if !strings.HasPrefix(c.GetHeader("Content-Type"), "application/json") {
		reject()
		return
	}
	c.Request.Body = http.MaxBytesReader(c.Writer, c.Request.Body, 12*1024)
	var envelope PasswordEnvelope
	decoder := json.NewDecoder(c.Request.Body)
	decoder.DisallowUnknownFields()
	if err := decoder.Decode(&envelope); err != nil {
		reject()
		return
	}
	if decoder.Decode(new(any)) != io.EOF || envelope.Version != 1 {
		reject()
		return
	}
	if envelope.KeyID != t.keyID {
		c.AbortWithStatusJSON(http.StatusConflict, gin.H{"error": "加密密钥已更新，请重新提交", "code": "PASSWORD_KEY_CHANGED"})
		return
	}
	wrapped, err := base64.StdEncoding.DecodeString(envelope.WrappedKey)
	if err != nil || len(wrapped) != t.private.Size() {
		reject()
		return
	}
	key, err := rsa.DecryptOAEP(sha256.New(), rand.Reader, t.private, wrapped, nil)
	if err != nil || len(key) != 32 {
		reject()
		return
	}
	block, err := aes.NewCipher(key)
	if err != nil {
		reject()
		return
	}
	gcm, err := cipher.NewGCM(block)
	if err != nil {
		reject()
		return
	}
	iv, err := base64.StdEncoding.DecodeString(envelope.IV)
	if err != nil || len(iv) != gcm.NonceSize() {
		reject()
		return
	}
	encrypted, err := base64.StdEncoding.DecodeString(envelope.Data)
	if err != nil {
		reject()
		return
	}
	plaintext, err := gcm.Open(nil, iv, encrypted, passwordAAD(c.Request.URL.Path))
	if err != nil {
		reject()
		return
	}
	var payload struct {
		IssuedAt int64           `json:"issuedAt"`
		Data     json.RawMessage `json:"data"`
	}
	if json.Unmarshal(plaintext, &payload) != nil || len(payload.Data) > 4096 || len(payload.Data) == 0 || payload.Data[0] != '{' {
		reject()
		return
	}
	now := time.Now().Unix()
	if payload.IssuedAt < now-120 || payload.IssuedAt > now+30 {
		reject()
		return
	}
	// 按随机 AES 密钥原子去重，重新包装 RSA 或更换 IV 也不能重复使用。
	hash := sha256.Sum256(key)
	accepted, err := t.redis.SetNX(c.Request.Context(), "password:used:"+hex.EncodeToString(hash[:]), "1", 3*time.Minute).Result()
	if err != nil {
		c.AbortWithStatusJSON(http.StatusServiceUnavailable, gin.H{"error": "认证暂不可用，请稍后重试"})
		return
	}
	if !accepted {
		reject()
		return
	}
	c.Set("passwordTransportKey", key)
	c.Request.Body = io.NopCloser(bytes.NewReader(payload.Data))
	c.Request.ContentLength = int64(len(payload.Data))
	c.Next()
}

// 重置产生的新密码只在浏览器内解密展示，HTTP 响应中不返回明文。
func encryptedPasswordResponse(c *gin.Context, secret string) {
	value, ok := c.Get("passwordTransportKey")
	key, valid := value.([]byte)
	if !ok || !valid || len(key) != 32 {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "密码响应加密不可用"})
		return
	}
	block, err := aes.NewCipher(key)
	if err != nil {
		c.Status(http.StatusInternalServerError)
		return
	}
	gcm, err := cipher.NewGCM(block)
	if err != nil {
		c.Status(http.StatusInternalServerError)
		return
	}
	iv := make([]byte, gcm.NonceSize())
	if _, err = rand.Read(iv); err != nil {
		c.Status(http.StatusInternalServerError)
		return
	}
	body, _ := json.Marshal(gin.H{"password": secret})
	aad := append([]byte("response\n"), passwordAAD(c.Request.URL.Path)...)
	data := gcm.Seal(nil, iv, body, aad)
	c.Header("Cache-Control", "no-store")
	c.JSON(http.StatusOK, gin.H{"version": 1, "iv": base64.StdEncoding.EncodeToString(iv), "data": base64.StdEncoding.EncodeToString(data)})
}
