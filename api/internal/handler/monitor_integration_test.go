package handler

import (
	"bytes"
	"context"
	"database/sql"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"os"
	"strings"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/go-sql-driver/mysql"
	"github.com/kakozane/kakozane-blog/api/internal/model"
	"github.com/kakozane/kakozane-blog/api/internal/password"
	"github.com/kakozane/kakozane-blog/api/internal/repository"
	"github.com/kakozane/kakozane-blog/api/internal/service"
	"github.com/kakozane/kakozane-blog/api/migrations"
	"github.com/redis/go-redis/v9"
)

func TestMonitorIntegration(t *testing.T) {
	dsn := os.Getenv("BLOG_MONITOR_TEST_DSN")
	address := os.Getenv("BLOG_TEST_REDIS")
	if dsn == "" || address == "" {
		t.Skip("set BLOG_MONITOR_TEST_DSN to a disposable MySQL database and BLOG_TEST_REDIS")
	}
	mysqlConfig, err := mysql.ParseDSN(dsn)
	if err != nil {
		t.Fatal(err)
	}
	db, err := sql.Open("mysql", dsn)
	if err != nil {
		t.Fatal(err)
	}
	defer db.Close()
	client := redis.NewClient(&redis.Options{Addr: address, DB: 3, ContextTimeoutEnabled: true})
	defer client.Close()
	ctx := context.Background()
	if err := migrations.Apply(ctx, db); err != nil {
		t.Fatal(err)
	}
	if _, err := db.Exec(`CREATE OR REPLACE VIEW monitor_test_view AS SELECT 'must-not-expose-row-content' AS payload`); err != nil {
		t.Fatal(err)
	}
	defer db.Exec("DROP VIEW monitor_test_view")
	if err := client.Set(ctx, "must-not-expose-key", "must-not-expose-value", time.Hour).Err(); err != nil {
		t.Fatal(err)
	}
	defer client.Del(ctx, "must-not-expose-key")
	hash, err := password.Hash("monitor-test-password")
	if err != nil {
		t.Fatal(err)
	}
	for _, role := range []string{"admin", "reader"} {
		_, err = db.Exec(`INSERT INTO users(username,display_name,password_hash,role) VALUES(?,?,?,?) ON DUPLICATE KEY UPDATE password_hash=VALUES(password_hash)`, "monitor_"+role, "Monitor", hash, role)
		if err != nil {
			t.Fatal(err)
		}
	}
	authRepo := repository.NewAuthRepository(db, client)
	authService := service.NewAuthService(authRepo)
	auth := NewAuthHandler(authService, nil)
	repo := repository.NewMonitorRepository(db, client, mysqlConfig.Addr, mysqlConfig.DBName)
	s := service.NewMonitorService(repo, t.TempDir())
	h := NewMonitorHandler(s)
	runCtx, cancel := context.WithCancel(ctx)
	done := make(chan struct{})
	go func() { s.Run(runCtx); close(done) }()
	defer func() { cancel(); <-done }()
	r := gin.New()
	r.Use(h.Middleware, gin.Recovery())
	r.POST("/api/v1/admin/auth/login", auth.AdminLogin)
	r.POST("/api/v1/auth/login", auth.FrontLogin)
	admin := r.Group("/api/v1/admin", auth.RequireAdmin)
	admin.GET("/monitor/overview", h.Snapshot)
	admin.GET("/monitor/logs", h.Logs)
	admin.PUT("/posts/:id", func(c *gin.Context) { c.Status(204) })
	request := func(method, path, body string, cookie *http.Cookie) *httptest.ResponseRecorder {
		req := httptest.NewRequest(method, "https://blog.test"+path, strings.NewReader(body))
		req.Header.Set("Content-Type", "application/json")
		req.Header.Set("Origin", "https://blog.test")
		req.Header.Set("User-Agent", "monitor-integration")
		if cookie != nil {
			req.AddCookie(cookie)
		}
		w := httptest.NewRecorder()
		r.ServeHTTP(w, req)
		return w
	}
	if w := request("GET", "/api/v1/admin/monitor/overview", "", nil); w.Code != 401 {
		t.Fatal("anonymous monitor access", w.Code)
	}
	login := func(path, username, secret string) *httptest.ResponseRecorder {
		b, _ := json.Marshal(map[string]string{"username": username, "password": secret})
		return request("POST", path, string(b), nil)
	}
	reader := login("/api/v1/auth/login", "monitor_reader", "monitor-test-password")
	if reader.Code != 200 {
		t.Fatal(reader.Body.String())
	}
	if w := request("GET", "/api/v1/admin/monitor/logs?kind=login", "", reader.Result().Cookies()[0]); w.Code != 401 {
		t.Fatal("reader leaked monitor", w.Code)
	}
	// 即使手工构造后台会话，读者身份也必须被服务端拒绝。
	ru, _ := authRepo.FindByUsername(ctx, "monitor_reader")
	if err := authRepo.SaveSession(ctx, "admin", "reader-forged-scope", ru.ID, ru.SessionVersion); err != nil {
		t.Fatal(err)
	}
	if w := request("GET", "/api/v1/admin/monitor/overview", "", &http.Cookie{Name: adminCookie, Value: "reader-forged-scope"}); w.Code != 401 {
		t.Fatal("reader role accepted", w.Code)
	}
	fail := login("/api/v1/admin/auth/login", "monitor_admin", "wrong-test-password")
	if fail.Code != 401 {
		t.Fatal(fail.Code)
	}
	success := login("/api/v1/admin/auth/login", "monitor_admin", "monitor-test-password")
	if success.Code != 200 {
		t.Fatal(success.Body.String())
	}
	cookie := success.Result().Cookies()[0]
	w := request("PUT", "/api/v1/admin/posts/42?token=must-not-log", `{"password":"do-not-record"}`, cookie)
	if w.Code != 204 {
		t.Fatal(w.Body.String())
	}
	deadline := time.Now().Add(5 * time.Second)
	for {
		w = request("GET", "/api/v1/admin/monitor/logs?kind=operation", "", cookie)
		if w.Code != 200 {
			t.Fatal(w.Body.String())
		}
		if bytes.Contains(w.Body.Bytes(), []byte(`"targetId":"42"`)) {
			break
		}
		if time.Now().After(deadline) {
			t.Fatal("audit queue not persisted")
		}
		time.Sleep(20 * time.Millisecond)
	}
	if bytes.Contains(w.Body.Bytes(), []byte("must-not-log")) || bytes.Contains(w.Body.Bytes(), []byte("do-not-record")) || !bytes.Contains(w.Body.Bytes(), []byte("monitor_admin")) {
		t.Fatal("audit privacy/actor failure", w.Body.String())
	}
	w = request("GET", "/api/v1/admin/monitor/logs?kind=login&result=failure&q=monitor_admin", "", cookie)
	var logs struct{ Items []model.MonitorLog }
	if err := json.Unmarshal(w.Body.Bytes(), &logs); err != nil || len(logs.Items) == 0 || logs.Items[0].Status != 401 {
		t.Fatal("failed login missing", w.Body.String())
	}
	for time.Now().Before(deadline) && s.Snapshot().SampledAt.IsZero() {
		time.Sleep(20 * time.Millisecond)
	}
	snapshot := s.Snapshot()
	if snapshot.MySQL.Status != "ok" || snapshot.Redis.Status != "ok" {
		t.Fatalf("dependency sampling failed: %+v %+v", snapshot.MySQL, snapshot.Redis)
	}
	if snapshot.MySQL.Connection == nil || snapshot.MySQL.Connection.Database != mysqlConfig.DBName || snapshot.MySQL.Connection.Port == "" || len(snapshot.MySQL.Connection.ResolvedIPs) == 0 {
		t.Fatal("MySQL connection metadata missing")
	}
	if len(snapshot.MySQL.Details) != 8 || snapshot.Redis.Connection.Database != "db3" || len(snapshot.Redis.Details) == 0 {
		t.Fatal("database details missing")
	}
	seenView, seenTable, seenKeyspace := false, false, false
	for _, table := range snapshot.MySQL.Tables {
		if table.Schema != mysqlConfig.DBName {
			t.Fatal("table outside current schema exposed")
		}
		if table.Name == "monitor_test_view" {
			seenView = table.Type == "VIEW" && table.Rows == nil && table.DataBytes == nil && table.Engine == nil
		}
		if table.Name == "monitor_logs" {
			seenTable = table.Rows != nil && table.DataBytes != nil && table.IndexBytes != nil && table.Engine != nil && table.CreatedAt != nil
		}
	}
	for _, space := range snapshot.Redis.Keyspaces {
		if space.Database == 3 && space.Keys > 0 && space.Expires > 0 {
			seenKeyspace = true
		}
	}
	if !seenView || !seenTable || !seenKeyspace {
		t.Fatalf("metadata not sampled: view=%v table=%v keyspace=%v", seenView, seenTable, seenKeyspace)
	}
	w = request("GET", "/api/v1/admin/monitor/overview", "", cookie)
	if w.Code != 200 || !strings.Contains(w.Body.String(), "monitor_test_view") {
		t.Fatal("admin database details unavailable")
	}
	for _, forbidden := range []string{"must-not-expose", "password_hash", "monitor-test-password", "requirepass"} {
		if strings.Contains(w.Body.String(), forbidden) {
			t.Fatalf("monitor response leaked %s", forbidden)
		}
	}
	// 仅当前测试库的 SELECT 权限，也应能采集库/表和实例摘要。
	if _, err := db.Exec("CREATE USER IF NOT EXISTS 'monitor_readonly_test'@'%' IDENTIFIED BY 'monitor-readonly-only'"); err != nil {
		t.Fatal(err)
	}
	defer db.Exec("DROP USER 'monitor_readonly_test'@'%'")
	if _, err := db.Exec("GRANT SELECT ON `" + strings.ReplaceAll(mysqlConfig.DBName, "`", "``") + "`.* TO 'monitor_readonly_test'@'%'"); err != nil {
		t.Fatal(err)
	}
	readonlyConfig := mysqlConfig.Clone()
	readonlyConfig.User, readonlyConfig.Passwd = "monitor_readonly_test", "monitor-readonly-only"
	readonlyDB, err := sql.Open("mysql", readonlyConfig.FormatDSN())
	if err != nil {
		t.Fatal(err)
	}
	defer readonlyDB.Close()
	readonly := repository.NewMonitorRepository(readonlyDB, client, mysqlConfig.Addr, mysqlConfig.DBName).MySQL(ctx)
	if readonly.Status != "ok" || len(readonly.Tables) == 0 || len(readonly.Details) == 0 {
		t.Fatalf("read-only schema account cannot monitor: %+v", readonly)
	}
	// INFO 被 ACL 禁止时，仍能显示配置地址及 DBSIZE 的结果。
	if err := client.Do(ctx, "ACL", "SETUSER", "monitor_limited_test", "on", ">monitor-acl-only", "-@all", "+ping", "+dbsize").Err(); err != nil {
		t.Fatal(err)
	}
	defer client.Do(ctx, "ACL", "DELUSER", "monitor_limited_test")
	limitedClient := redis.NewClient(&redis.Options{Addr: address, Username: "monitor_limited_test", Password: "monitor-acl-only", ContextTimeoutEnabled: true})
	defer limitedClient.Close()
	limited := repository.NewMonitorRepository(db, limitedClient, mysqlConfig.Addr, mysqlConfig.DBName).Redis(ctx)
	if limited.Status != "partial" || limited.Connection == nil || len(limited.Details) != 0 || len(limited.Keyspaces) != 0 {
		t.Fatalf("Redis ACL failure not isolated: %+v", limited)
	}
	keysAvailable := false
	for _, metric := range limited.Metrics {
		keysAvailable = keysAvailable || metric.Key == "keys"
	}
	if !keysAvailable {
		t.Fatal("Redis INFO ACL failure hid DBSIZE")
	}
	// 同一连接中断不能拖住其他依赖探测。
	dead := redis.NewClient(&redis.Options{Addr: "127.0.0.1:1", MaxRetries: -1})
	defer dead.Close()
	degraded := repository.NewMonitorRepository(db, dead, mysqlConfig.Addr, mysqlConfig.DBName)
	timeout, cancelProbe := context.WithTimeout(ctx, 200*time.Millisecond)
	defer cancelProbe()
	failed := degraded.Redis(timeout)
	if failed.Status != "error" || failed.Connection == nil || failed.Connection.Host != "127.0.0.1" || failed.Connection.Port != "1" {
		t.Fatal("dependency failure reported healthy")
	}
	old := model.MonitorLog{Kind: "login", Scope: "front", Method: "POST", Route: "old", Status: 200, CreatedAt: time.Now().AddDate(0, 0, -31)}
	if err := repo.InsertLog(ctx, old); err != nil {
		t.Fatal(err)
	}
	if err := repo.Cleanup(ctx); err != nil {
		t.Fatal(err)
	}
	flushRoute := "shutdown-" + time.Now().Format("150405.000000000")
	for i := 0; i < 20; i++ {
		s.Record(model.MonitorLog{Kind: "operation", Scope: "admin", Method: "POST", Route: flushRoute, Status: 200, CreatedAt: time.Now()})
	}
	cancel()
	<-done
	var flushed int
	if err := db.QueryRow("SELECT COUNT(*) FROM monitor_logs WHERE route=?", flushRoute).Scan(&flushed); err != nil || flushed != 20 {
		t.Fatalf("shutdown flush: %d, %v", flushed, err)
	}
	var count int
	if err := db.QueryRow("SELECT COUNT(*) FROM monitor_logs WHERE route='old'").Scan(&count); err != nil || count != 0 {
		t.Fatal("retention cleanup failed")
	}
}
