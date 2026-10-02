package repository

import (
	"context"
	"fmt"
	"github.com/redis/go-redis/v9"
	"os"
	"testing"
	"time"
)

func TestPresenceDeduplicatesAndExpires(t *testing.T) {
	address := os.Getenv("BLOG_TEST_REDIS")
	if address == "" {
		t.Skip("set BLOG_TEST_REDIS for the Redis integration check")
	}
	client := redis.NewClient(&redis.Options{Addr: address})
	defer client.Close()
	ctx := context.Background()
	key := fmt.Sprintf("test:presence:%d", time.Now().UnixNano())
	defer client.Del(ctx, key)
	touch := func(visitor string, want int64) {
		t.Helper()
		count, err := presenceScript.Run(ctx, client, []string{key}, visitor).Int64()
		if err != nil || count != want {
			t.Fatalf("touch %s: count=%d want=%d err=%v", visitor, count, want, err)
		}
	}
	touch("browser-a", 1)
	touch("browser-a", 1) // second tab / reconnect
	touch("browser-b", 2)
	now, err := client.Time(ctx).Result()
	if err != nil {
		t.Fatal(err)
	}
	if err := client.ZAdd(ctx, key, redis.Z{Score: float64(now.Unix() - 76), Member: "browser-b"}).Err(); err != nil {
		t.Fatal(err)
	}
	touch("browser-a", 1)
	ttl, err := client.TTL(ctx, key).Result()
	if err != nil || ttl <= 0 || ttl > 150*time.Second {
		t.Fatalf("missing cleanup TTL: %v %v", ttl, err)
	}
}
