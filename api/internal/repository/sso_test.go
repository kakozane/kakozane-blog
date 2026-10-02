package repository

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"errors"
	"os"
	"testing"
	"time"

	"github.com/redis/go-redis/v9"
)

// 使用独立随机键检查真实 Redis 原子消费，不清空数据库。
func TestSSOTicketLifecycle(t *testing.T) {
	address := os.Getenv("BLOG_TEST_REDIS")
	if address == "" {
		t.Skip("set BLOG_TEST_REDIS to run the Redis integration check")
	}
	client := redis.NewClient(&redis.Options{Addr: address})
	t.Cleanup(func() { _ = client.Close() })
	ctx := context.Background()
	repo := NewAuthRepository(nil, client)
	random := make([]byte, 32)
	if _, err := rand.Read(random); err != nil {
		t.Fatal(err)
	}
	token := hex.EncodeToString(random)
	ticket := token + "-ticket"
	const origin = "https://admin.dev.kakozane.icu"
	key := ssoTicketKey(ticket, "admin", origin)
	t.Cleanup(func() { client.Del(ctx, key, sessionKey("front", token)) })
	user := User{ID: 123, SessionVersion: 4}
	if err := repo.SaveSession(ctx, "front", token, user.ID, user.SessionVersion); err != nil {
		t.Fatal(err)
	}
	issue := func() {
		t.Helper()
		if err := repo.SaveSSOTicket(ctx, ticket, "front", token, "admin", origin, user); err != nil {
			t.Fatal(err)
		}
	}
	issue()
	for _, wrong := range []struct{ scope, origin string }{{"front", origin}, {"admin", "https://admin.kakozane.icu"}} {
		if _, err := repo.ConsumeSSOTicket(ctx, ticket, wrong.scope, wrong.origin); !errors.Is(err, redis.Nil) {
			t.Fatalf("wrong audience: %v", err)
		}
	}
	// 两个并发交换中只有一个成功。
	results := make(chan error, 2)
	for range 2 {
		go func() { _, err := repo.ConsumeSSOTicket(ctx, ticket, "admin", origin); results <- err }()
	}
	first, second := <-results, <-results
	if !((first == nil && errors.Is(second, redis.Nil)) || (second == nil && errors.Is(first, redis.Nil))) {
		t.Fatalf("non-atomic redemption: %v / %v", first, second)
	}
	issue()
	if ttl := client.TTL(ctx, key).Val(); ttl <= 0 || ttl > time.Minute {
		t.Fatalf("unexpected TTL: %v", ttl)
	}
	if err := client.ExpireAt(ctx, key, time.Now().Add(-time.Second)).Err(); err != nil {
		t.Fatal(err)
	}
	if _, err := repo.ConsumeSSOTicket(ctx, ticket, "admin", origin); !errors.Is(err, redis.Nil) {
		t.Fatalf("expired ticket accepted: %v", err)
	}
	issue()
	if err := repo.DeleteSession(ctx, "front", token); err != nil {
		t.Fatal(err)
	}
	if _, err := repo.ConsumeSSOTicket(ctx, ticket, "admin", origin); !errors.Is(err, redis.Nil) {
		t.Fatalf("logged-out source accepted: %v", err)
	}
}
