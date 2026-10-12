package service

import (
	"context"
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"os"
	"strings"
	"sync"
	"testing"
	"time"

	"github.com/redis/go-redis/v9"
)

type mailTransport func(*http.Request) (*http.Response, error)

func (f mailTransport) RoundTrip(r *http.Request) (*http.Response, error) { return f(r) }

func TestNormalizeRegistrationEmail(t *testing.T) {
	for _, input := range []string{"", "bob", "Bob <bob@example.com>", "bob@example", "人@example.com", "a\r\n@example.com"} {
		if _, err := normalizeEmail(input); err == nil {
			t.Fatalf("accepted %q", input)
		}
	}
	if got, err := normalizeEmail(" BOB@Example.com "); err != nil || got != "bob@example.com" {
		t.Fatal(got, err)
	}
	if err := (*RegistrationEmail)(nil).Send(context.Background(), "bob@example.com", "test"); !errors.Is(err, ErrEmailUnavailable) {
		t.Fatal(err)
	}
}

func TestRegistrationEmailRedis(t *testing.T) {
	address := os.Getenv("BLOG_TEST_REDIS")
	if address == "" {
		t.Skip("set BLOG_TEST_REDIS to a disposable Redis instance")
	}
	ctx := context.Background()
	client := redis.NewClient(&redis.Options{Addr: address})
	t.Cleanup(func() { client.Close() })
	// This suite owns only these keys, never flushes Redis or touches sessions.
	email := "registration-test@example.com"
	base := "register:email:" + emailDigest(email)
	keys := []string{base + ":code", base + ":cooldown", base + ":hour", "register:mail-ip:" + emailDigest("test-ip"), "register:mail-day"}
	clean := func() {
		if err := client.Del(ctx, keys...).Err(); err != nil {
			t.Fatal(err)
		}
	}
	clean()
	t.Cleanup(clean)
	sender := NewRegistrationEmail(client, "test-key", "Retniw <noreply@example.com>")
	code := ""
	calls := 0
	sender.client.Transport = mailTransport(func(r *http.Request) (*http.Response, error) {
		calls++
		if r.URL.String() != "https://api.resend.com/emails" || r.Header.Get("Authorization") != "Bearer test-key" {
			t.Fatal("invalid Resend request")
		}
		var body struct {
			To   []string `json:"to"`
			Text string   `json:"text"`
		}
		if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
			t.Fatal(err)
		}
		if len(body.To) != 1 || body.To[0] != email {
			t.Fatal("wrong recipient")
		}
		code = strings.Split(strings.Split(body.Text, "：")[1], "\n")[0]
		return &http.Response{StatusCode: 200, Body: io.NopCloser(strings.NewReader(`{"id":"test"}`))}, nil
	})
	if err := sender.Send(ctx, email, "test-ip"); err != nil {
		t.Fatal(err)
	}
	if err := sender.Send(ctx, email, "test-ip"); !errors.Is(err, ErrEmailSendLimited) || calls != 1 {
		t.Fatal("cooldown bypass", err, calls)
	}
	if ttl := client.TTL(ctx, base+":code").Val(); ttl <= 0 || ttl > 10*time.Minute {
		t.Fatal("bad TTL", ttl)
	}
	var wg sync.WaitGroup
	results := make(chan error, 2)
	for i := 0; i < 2; i++ {
		wg.Add(1)
		go func() { defer wg.Done(); results <- sender.Verify(ctx, email, code) }()
	}
	wg.Wait()
	close(results)
	successes := 0
	for err := range results {
		if err == nil {
			successes++
		} else if !errors.Is(err, ErrEmailCode) {
			t.Fatal(err)
		}
	}
	if successes != 1 {
		t.Fatal("concurrent replay", successes)
	}
	seed := func() {
		if err := client.Set(ctx, base+":code", emailDigest(email+":"+code)+":0", 10*time.Minute).Err(); err != nil {
			t.Fatal(err)
		}
	}
	seed()
	wrong := "000000"
	if code == wrong {
		wrong = "111111"
	}
	for i := 0; i < 5; i++ {
		if err := sender.Verify(ctx, email, wrong); !errors.Is(err, ErrEmailCode) {
			t.Fatal(err)
		}
	}
	if err := sender.Verify(ctx, email, code); !errors.Is(err, ErrEmailCode) {
		t.Fatal("attempt limit bypass")
	}
	seed()
	client.PExpire(ctx, base+":code", time.Millisecond)
	time.Sleep(10 * time.Millisecond)
	if err := sender.Verify(ctx, email, code); !errors.Is(err, ErrEmailCode) {
		t.Fatal("expired code accepted")
	}
	// Check each quota independently, without invoking the provider.
	for _, limit := range []struct {
		key string
		n   int
	}{{keys[2], 5}, {keys[3], 10}, {keys[4], 90}} {
		clean()
		client.Set(ctx, limit.key, limit.n, time.Hour)
		if err := sender.Send(ctx, email, "test-ip"); !errors.Is(err, ErrEmailSendLimited) {
			t.Fatal("quota bypass", err)
		}
	}
	clean()
	seed()
	sender.client.Transport = mailTransport(func(*http.Request) (*http.Response, error) {
		return &http.Response{StatusCode: 500, Body: io.NopCloser(strings.NewReader("private provider details"))}, nil
	})
	if err := sender.Send(ctx, email, "test-ip"); !errors.Is(err, ErrEmailUnavailable) || strings.Contains(err.Error(), "private") {
		t.Fatal(err)
	}
	if err := sender.Verify(ctx, email, code); !errors.Is(err, ErrEmailCode) {
		t.Fatal("failed delivery left usable code")
	}
}
