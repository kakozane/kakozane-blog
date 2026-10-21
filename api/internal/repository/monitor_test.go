package repository

import (
	"strings"
	"testing"
	"time"

	"github.com/kakozane/kakozane-blog/api/internal/model"
)

func TestMonitorRedisWhitelist(t *testing.T) {
	values := redisMetrics("# Stats\r\nused_memory:1024\r\nkeyspace_hits:3\r\nkeyspace_misses:1\r\nrequirepass:secret\r\nconfig_file:/private/file\r\nrdb_last_bgsave_status:err\r\n")
	seen := map[string]float64{}
	for _, m := range values {
		seen[m.Key] = m.Value
		if strings.Contains(m.Label, "secret") || m.Key == "requirepass" || m.Key == "config_file" {
			t.Fatal("sensitive Redis fields leaked")
		}
	}
	if seen["hit_rate"] != 75 || seen["used_memory"] != 1024 || seen["rdb_last_bgsave_status"] != 0 {
		t.Fatal(seen)
	}
	for _, m := range redisMetrics("keyspace_hits:0\nkeyspace_misses:0") {
		if m.Key == "hit_rate" {
			t.Fatal("undefined hit rate reported")
		}
	}
}
func TestMonitorFilterIsParameterized(t *testing.T) {
	f := model.MonitorLogFilter{Kind: "login", Scope: "admin", Result: "failure", Query: "' OR 1=1 --", From: time.Now(), To: time.Now()}
	where, args := logWhere(f)
	if strings.Contains(where, f.Query) || !strings.Contains(where, "status >= 400") || len(args) != 6 {
		t.Fatalf("unsafe filter: %s %#v", where, args)
	}
}
