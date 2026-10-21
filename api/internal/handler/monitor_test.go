package handler

import (
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/kakozane/kakozane-blog/api/internal/service"
)

func TestMonitorFilterValidation(t *testing.T) {
	for _, query := range []string{"kind=login&page=-1", "kind=login&pageSize=9999", "kind=login&scope=other", "kind=login&result=other", "kind=invalid", "kind=login&from=invalid", "kind=login&from=2020-01-01T00:00:00Z&to=2026-01-01T00:00:00Z"} {
		c, _ := gin.CreateTestContext(httptest.NewRecorder())
		c.Request = httptest.NewRequest("GET", "/?"+query, nil)
		if _, ok := monitorFilter(c); ok {
			t.Fatalf("accepted %s", query)
		}
	}
	c, _ := gin.CreateTestContext(httptest.NewRecorder())
	c.Request = httptest.NewRequest("GET", "/?kind=login", nil)
	f, ok := monitorFilter(c)
	if !ok || f.Page != 1 || f.PageSize != 20 || time.Since(f.From) < 29*24*time.Hour {
		t.Fatalf("bad defaults: %+v", f)
	}
}
func TestMonitorMetadataAndExclusions(t *testing.T) {
	s := service.NewMonitorService(nil, t.TempDir())
	h := NewMonitorHandler(s)
	r := gin.New()
	r.Use(h.Middleware, gin.Recovery())
	r.POST("/api/v1/admin/posts/:id", func(c *gin.Context) { c.Status(204) })
	r.POST("/api/v1/admin/auth/login", func(c *gin.Context) { c.Status(401) })
	r.POST("/api/v1/auth/sso/exchange", func(c *gin.Context) { c.Status(403) })
	r.GET("/api/v1/events", func(c *gin.Context) { c.Status(200) })
	r.GET("/api/v1/health", func(c *gin.Context) { c.Status(200) })
	r.GET("/api/v1/admin/monitor/overview", h.Snapshot)
	r.GET("/api/v1/panic", func(c *gin.Context) { panic("test") })
	for _, route := range []struct{ method, path string }{{"POST", "/api/v1/admin/posts/12?password=secret"}, {"POST", "/api/v1/admin/auth/login"}, {"POST", "/api/v1/auth/sso/exchange"}, {"GET", "/api/v1/events"}, {"GET", "/api/v1/health"}, {"GET", "/api/v1/admin/monitor/overview"}, {"GET", "/api/v1/panic"}} {
		r.ServeHTTP(httptest.NewRecorder(), httptest.NewRequest(route.method, route.path, strings.NewReader(`{"password":"secret"}`)))
	}
	snap := s.Snapshot()
	if len(snap.Routes) != 4 || snap.QueueDepth != 4 {
		t.Fatalf("wrong counts: %+v", snap)
	}
	found := false
	for _, v := range snap.Routes {
		if strings.Contains(v.Route, "secret") || strings.Contains(v.Route, "12") {
			t.Fatal("raw URL leaked")
		}
		if v.Route == "/api/v1/panic" && v.Errors == 1 {
			found = true
		}
	}
	if !found {
		t.Fatal("panic not counted as 500")
	}
}
func TestMonitorSafeIPAndText(t *testing.T) {
	c, _ := gin.CreateTestContext(httptest.NewRecorder())
	c.Request = httptest.NewRequest("GET", "/", nil)
	c.Request.RemoteAddr = "8.8.8.8:4321"
	c.Request.Header.Set("X-Real-IP", "1.2.3.4")
	if monitorIP(c) != "8.8.8.8" {
		t.Fatal("trusted public forged forwarding header")
	}
	c.Request.RemoteAddr = "172.18.0.2:4321"
	if monitorIP(c) != "1.2.3.4" {
		t.Fatal("proxy IP not accepted")
	}
	if monitorText("你好\n世界", 3) != "你好世" {
		t.Fatal("unsafe text truncation")
	}
}
