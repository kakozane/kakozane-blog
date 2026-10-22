package repository

import (
	"context"
	"encoding/json"
	"strings"
	"testing"
	"time"

	"github.com/kakozane/kakozane-blog/api/internal/model"
)

func TestMonitorConnection(t *testing.T) {
	for _, address := range []string{"127.0.0.1:33316", "[::1]:6379"} {
		result := monitorConnection(context.Background(), address, "blog")
		if result.ResolveFailed || result.Database != "blog" || len(result.ResolvedIPs) != 1 || result.ResolvedIPs[0] != result.Host || result.Port == "" {
			t.Fatalf("invalid connection metadata: %+v", result)
		}
	}
	ctx, cancel := context.WithCancel(context.Background())
	cancel()
	result := monitorConnection(ctx, "monitor-test.invalid:3306", "blog")
	if !result.ResolveFailed || result.Host != "monitor-test.invalid" || result.Port != "3306" || len(result.ResolvedIPs) != 0 {
		t.Fatalf("DNS failure lost configured endpoint: %+v", result)
	}
}

func TestRedisDetailsWhitelistAndKeyspaces(t *testing.T) {
	details, keyspaces := redisDetails("# Server\r\nredis_version:8.0.0\r\ntcp_port:6379\r\nrequirepass:secret\r\nconfig_file:/private/file\r\nmaster_host:private-host\r\n" +
		"db10:keys=5,expires=2,avg_ttl=9000,subexpiry=1\r\ndb2:keys=1,expires=0,avg_ttl=0\r\ndb0:keys=bad,expires=1,avg_ttl=1\r\ndb1:keys=-1,expires=0,avg_ttl=0\r\ndb3:keys=2,expires=1\r\ndbfoo:keys=1,expires=0,avg_ttl=0\r\n")
	if len(details) != 2 || len(keyspaces) != 2 || keyspaces[0].Database != 2 || keyspaces[1].Database != 10 || keyspaces[1].AvgTTLMS != 9000 || keyspaces[1].Expires != 2 {
		t.Fatalf("unexpected Redis details: %+v %+v", details, keyspaces)
	}
	b, _ := json.Marshal(details)
	for _, forbidden := range []string{"secret", "private", "requirepass", "config_file", "master_host"} {
		if strings.Contains(string(b), forbidden) {
			t.Fatalf("Redis details leaked %s", forbidden)
		}
	}
}

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
