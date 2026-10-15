package repository

import (
	"context"
	"errors"
	"fmt"
	"os"
	"sync"
	"testing"
	"time"

	"github.com/redis/go-redis/v9"
)

func TestSingleSession(t *testing.T) {
	address := os.Getenv("BLOG_TEST_REDIS")
	if address == "" {
		t.Skip("set BLOG_TEST_REDIS to run the Redis integration check")
	}
	client := redis.NewClient(&redis.Options{Addr: address})
	defer client.Close()
	ctx := context.Background()
	repo := NewAuthRepository(nil, client)
	id := time.Now().UnixNano()
	prefix := fmt.Sprint(id)
	var keys []string
	for _, scope := range []string{"front", "admin"} {
		for _, uid := range []int64{id, id + 1} {
			keys = append(keys, activeSessionPrefix(scope)+fmt.Sprint(uid))
		}
		for i := 0; i < 20; i++ {
			keys = append(keys, sessionKey(scope, fmt.Sprintf("%s-%d", prefix, i)))
		}
	}
	t.Cleanup(func() { client.Del(ctx, keys...) })
	token := func(i int) string { return fmt.Sprintf("%s-%d", prefix, i) }
	save := func(scope string, i int, uid int64) {
		t.Helper()
		if err := repo.SaveSession(ctx, scope, token(i), uid, 1); err != nil {
			t.Fatal(err)
		}
	}
	valid := func(scope string, i int, want bool) {
		t.Helper()
		_, _, err := repo.SessionUserID(ctx, scope, token(i))
		if want && err != nil {
			t.Fatalf("%s/%d should be valid: %v", scope, i, err)
		}
		if !want && !errors.Is(err, redis.Nil) {
			t.Fatalf("%s/%d should be invalid: %v", scope, i, err)
		}
	}
	save("front", 0, id)
	save("admin", 0, id)
	save("front", 1, id+1)
	save("front", 2, id)
	valid("front", 0, false)
	valid("front", 2, true)
	valid("admin", 0, true)
	valid("front", 1, true)
	if err := repo.DeleteSession(ctx, "front", token(0)); err != nil {
		t.Fatal(err)
	}
	valid("front", 2, true)
	save("admin", 2, id)
	valid("admin", 0, false)
	valid("admin", 2, true)
	valid("front", 2, true)

	// 顶号后，旧会话签发但尚未兑换的 SSO 凭证也必须失效。
	ticket := prefix + "-ticket"
	const origin = "https://admin.example.com"
	ticketKey := ssoTicketKey(ticket, "admin", origin)
	t.Cleanup(func() { client.Del(ctx, ticketKey) })
	if err := repo.SaveSSOTicket(ctx, ticket, "front", token(2), "admin", origin, User{ID: id, SessionVersion: 1}); err != nil {
		t.Fatal(err)
	}
	save("front", 3, id)
	if _, err := repo.ConsumeSSOTicket(ctx, ticket, "admin", origin); !errors.Is(err, redis.Nil) {
		t.Fatalf("kicked source accepted: %v", err)
	}

	// 竞争登录之后只能留下一个有效会话。
	var wg sync.WaitGroup
	for i := 4; i < 20; i++ {
		wg.Add(1)
		go func(i int) {
			defer wg.Done()
			if err := repo.SaveSession(ctx, "front", token(i), id, 1); err != nil {
				t.Error(err)
			}
		}(i)
	}
	wg.Wait()
	count := 0
	for i := 0; i < 20; i++ {
		if i == 1 {
			continue
		}
		if _, _, err := repo.SessionUserID(ctx, "front", token(i)); err == nil {
			count++
		} else if !errors.Is(err, redis.Nil) {
			t.Fatal(err)
		}
	}
	if count != 1 {
		t.Fatalf("got %d active sessions", count)
	}
	index := activeSessionPrefix("front") + fmt.Sprint(id)
	active, err := client.Get(ctx, index).Result()
	if err != nil {
		t.Fatal(err)
	}
	for _, key := range []string{index, active} {
		ttl := client.TTL(ctx, key).Val()
		if ttl < 12*time.Hour-time.Minute || ttl > 12*time.Hour {
			t.Fatalf("unexpected TTL: %v", ttl)
		}
	}
	// 旧版本的无索引会话不绕过单会话限制。
	client.Set(ctx, sessionKey("front", token(0)), fmt.Sprintf("%d:1", id), time.Hour)
	valid("front", 0, false)
	client.Del(ctx, index)
	for i := 4; i < 20; i++ {
		valid("front", i, false)
	}
	// 正常退出清理索引；不会影响另一端。
	save("front", 0, id)
	if err := repo.DeleteSession(ctx, "front", token(0)); err != nil {
		t.Fatal(err)
	}
	valid("front", 0, false)
	if client.Exists(ctx, index).Val() != 0 {
		t.Fatal("logout left active index")
	}
	valid("admin", 2, true)
}
