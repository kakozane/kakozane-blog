package handler

import (
	"context"
	"net"
	"net/http"
	"strconv"
	"strings"
	"time"
	"unicode"

	"github.com/gin-gonic/gin"
	"github.com/kakozane/kakozane-blog/api/internal/model"
	"github.com/kakozane/kakozane-blog/api/internal/service"
)

type MonitorHandler struct{ service *service.MonitorService }

func NewMonitorHandler(s *service.MonitorService) *MonitorHandler { return &MonitorHandler{service: s} }
func monitorText(value string, limit int) string {
	value = strings.Map(func(r rune) rune {
		if unicode.IsControl(r) {
			return -1
		}
		return r
	}, strings.ToValidUTF8(value, ""))
	runes := []rune(value)
	if len(runes) > limit {
		runes = runes[:limit]
	}
	return string(runes)
}
func monitorIP(c *gin.Context) string {
	peer, _, _ := net.SplitHostPort(c.Request.RemoteAddr)
	// API 只在内部网络发布，公网入口覆盖 X-Real-IP；不信任公网直连的转发头。
	ip := net.ParseIP(peer)
	if ip != nil && (ip.IsLoopback() || ip.IsPrivate()) {
		if real := net.ParseIP(c.GetHeader("X-Real-IP")); real != nil {
			return real.String()
		}
	}
	return peer
}
func (h *MonitorHandler) Middleware(c *gin.Context) {
	start := time.Now()
	c.Next()
	route := c.FullPath()
	if route == "" {
		route = "(unmatched)"
	}
	if !strings.HasPrefix(route, "/api/v1/") && route != "(unmatched)" {
		return
	}
	if route == "/api/v1/events" || route == "/api/v1/health" || strings.HasPrefix(route, "/api/v1/admin/monitor/") {
		return
	}
	status := c.Writer.Status()
	elapsed := time.Since(start)
	h.service.Observe(monitorText(c.Request.Method, 16), route, status, elapsed)
	scope := "front"
	if strings.HasPrefix(route, "/api/v1/admin/") {
		scope = "admin"
	}
	kind := ""
	if c.Request.Method == http.MethodPost && (strings.HasSuffix(route, "/auth/login") || strings.HasSuffix(route, "/auth/sso/exchange")) {
		kind = "login"
	} else if scope == "admin" && c.Request.Method != "GET" && c.Request.Method != "HEAD" && c.Request.Method != "OPTIONS" {
		kind = "operation"
	}
	item := model.MonitorLog{Kind: kind, Scope: scope, UserID: c.GetInt64("userID"), Username: monitorText(c.GetString("auditUsername"), 128), Method: monitorText(c.Request.Method, 16), Route: route, Status: status, DurationMS: elapsed.Milliseconds(), IP: monitorIP(c), UserAgent: monitorText(c.Request.UserAgent(), 512), CreatedAt: start.UTC()}
	if id, err := strconv.ParseInt(c.Param("id"), 10, 64); err == nil && id > 0 {
		item.TargetID = strconv.FormatInt(id, 10)
	}
	if kind != "" {
		h.service.Record(item)
	}
	if status >= 500 || elapsed >= time.Second {
		item.Kind = "request"
		h.service.Record(item)
	}
}

// Snapshot godoc
// @Summary 管理员查看系统、MySQL、Redis 和接口运行指标
// @Tags 系统监控
// @Produce json
// @Success 200 {object} model.MonitorSnapshot
// @Failure 401 {object} map[string]string
// @Router /admin/monitor/overview [get]
func (h *MonitorHandler) Snapshot(c *gin.Context) {
	c.Header("Cache-Control", "no-store")
	c.JSON(http.StatusOK, h.service.Snapshot())
}

func monitorFilter(c *gin.Context) (model.MonitorLogFilter, bool) {
	now := time.Now().UTC()
	f := model.MonitorLogFilter{Kind: c.Query("kind"), Scope: c.Query("scope"), Result: c.Query("result"), Query: strings.TrimSpace(c.Query("q")), From: now.AddDate(0, 0, -30), To: now.Add(time.Minute)}
	var err error
	if f.Page, err = strconv.Atoi(c.DefaultQuery("page", "1")); err != nil {
		return f, false
	}
	if f.PageSize, err = strconv.Atoi(c.DefaultQuery("pageSize", "20")); err != nil {
		return f, false
	}
	if f.Page < 1 || f.Page > 500 || f.PageSize < 1 || f.PageSize > 100 || len([]rune(f.Query)) > 128 {
		return f, false
	}
	if f.Kind != "login" && f.Kind != "operation" && f.Kind != "request" {
		return f, false
	}
	if f.Scope != "" && f.Scope != "front" && f.Scope != "admin" {
		return f, false
	}
	if f.Result != "" && f.Result != "success" && f.Result != "failure" {
		return f, false
	}
	if v := c.Query("from"); v != "" {
		f.From, err = time.Parse(time.RFC3339, v)
		if err != nil {
			return f, false
		}
	}
	if v := c.Query("to"); v != "" {
		f.To, err = time.Parse(time.RFC3339, v)
		if err != nil {
			return f, false
		}
	}
	if !f.To.After(f.From) || f.To.Sub(f.From) > 31*24*time.Hour {
		return f, false
	}
	return f, true
}

// Logs godoc
// @Summary 分页筛选登录、操作、异常及慢请求日志
// @Tags 系统监控
// @Produce json
// @Param kind query string true "login / operation / request"
// @Param scope query string false "front / admin"
// @Param result query string false "success / failure"
// @Param q query string false "精确匹配账号或 IP"
// @Param from query string false "起始时间 RFC3339"
// @Param to query string false "结束时间 RFC3339，不含边界"
// @Param page query int false "页码，1–500"
// @Param pageSize query int false "每页条数，1–100"
// @Success 200 {object} map[string]interface{}
// @Failure 400,401,503 {object} map[string]string
// @Router /admin/monitor/logs [get]
func (h *MonitorHandler) Logs(c *gin.Context) {
	c.Header("Cache-Control", "no-store")
	f, ok := monitorFilter(c)
	if !ok {
		c.JSON(http.StatusBadRequest, gin.H{"error": "日志筛选参数无效，时间范围不能超过 31 天"})
		return
	}
	ctx, cancel := context.WithTimeout(c.Request.Context(), 3*time.Second)
	defer cancel()
	items, total, err := h.service.ListLogs(ctx, f)
	if err != nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "日志暂不可用，请检查数据库连接"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"items": items, "total": total, "page": f.Page, "pageSize": f.PageSize})
}
