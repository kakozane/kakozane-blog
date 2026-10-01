package config

import (
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func TestLoad(t *testing.T) {
	path := filepath.Join(t.TempDir(), "config.yaml")
	valid := "server:\n  port: 6324\nmysql:\n  host: localhost\n  port: 3306\n  database: blog\n  user: blog\n  password: secret\nredis:\n  address: localhost:6379\n"
	if err := os.WriteFile(path, []byte(valid), 0600); err != nil {
		t.Fatal(err)
	}
	t.Setenv("BLOG_SERVER_PORT", "6327")
	t.Setenv("BLOG_MYSQL_HOST", "host.docker.internal")
	cfg, err := Load(path)
	if err != nil || cfg.Server.Port != 6327 || cfg.MySQL.Host != "host.docker.internal" {
		t.Fatalf("Load() = %+v, %v", cfg.Server, err)
	}
	if err := os.WriteFile(path, []byte(strings.Replace(valid, "password: secret", "password: ''", 1)), 0600); err != nil {
		t.Fatal(err)
	}
	if _, err := Load(path); err == nil {
		t.Fatal("Load() accepted an empty database password")
	}
}
