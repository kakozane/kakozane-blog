package handler

import (
	"errors"
	"log/slog"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/kakozane/kakozane-blog/api/internal/service"
)

func (h *AuthHandler) RegisterSSO(group *gin.RouterGroup, scope string) {
	group.GET("/sso/config", func(c *gin.Context) {
		c.Header("Cache-Control", "no-store")
		c.JSON(http.StatusOK, gin.H{"sourceOrigin": h.ssoPeer(c, scope)})
	})
	group.GET("/sso/status", func(c *gin.Context) { h.ssoStatus(c, scope) })
	group.POST("/sso/ticket", func(c *gin.Context) { h.ssoTicket(c, scope) })
	group.POST("/sso/exchange", func(c *gin.Context) { h.ssoExchange(c, scope) })
	for _, path := range []string{"/sso/status", "/sso/ticket"} {
		group.OPTIONS(path, func(c *gin.Context) {
			if h.allowSSOOrigin(c, scope) {
				c.Status(http.StatusNoContent)
			}
		})
	}
}

func (h *AuthHandler) ssoPeer(c *gin.Context, scope string) string {
	origin := "https://" + c.Request.Host
	for _, site := range h.ssoSites {
		if scope == service.ScopeFront && site.FrontOrigin == origin {
			return site.AdminOrigin
		}
		if scope == service.ScopeAdmin && site.AdminOrigin == origin {
			return site.FrontOrigin
		}
	}
	return ""
}

func (h *AuthHandler) allowSSOOrigin(c *gin.Context, scope string) bool {
	c.Header("Cache-Control", "no-store")
	c.Header("Vary", "Origin")
	if c.Request.TLS == nil && c.GetHeader("X-Forwarded-Proto") != "https" {
		c.JSON(http.StatusUpgradeRequired, gin.H{"error": "单点登录需要 HTTPS"})
		return false
	}
	peer := h.ssoPeer(c, scope)
	if peer == "" || c.GetHeader("Origin") != peer {
		c.JSON(http.StatusForbidden, gin.H{"error": "未授权的单点登录来源"})
		return false
	}
	c.Header("Access-Control-Allow-Origin", peer)
	c.Header("Access-Control-Allow-Credentials", "true")
	c.Header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
	c.Header("Access-Control-Allow-Headers", "Content-Type")
	return true
}

func (h *AuthHandler) ssoStatus(c *gin.Context, scope string) {
	if !h.allowSSOOrigin(c, scope) {
		return
	}
	user, err := h.service.CurrentUser(c.Request.Context(), scope, cookieValue(c, scope))
	if errors.Is(err, service.ErrUnauthenticated) {
		c.JSON(http.StatusOK, gin.H{"user": nil, "canLogin": false})
		return
	}
	if err != nil {
		ssoError(c, err)
		return
	}
	// 提示只包含公开账号信息，不把后台权限列表传给前台。
	c.JSON(http.StatusOK, gin.H{"user": profile(user, service.ScopeFront), "canLogin": scope == service.ScopeAdmin || user.Role == "admin"})
}

func (h *AuthHandler) ssoTicket(c *gin.Context, scope string) {
	if !h.allowSSOOrigin(c, scope) {
		return
	}
	if !strings.HasPrefix(c.GetHeader("Content-Type"), "application/json") {
		c.JSON(http.StatusUnsupportedMediaType, gin.H{"error": "需要 JSON 请求"})
		return
	}
	target := service.ScopeFront
	if scope == service.ScopeFront {
		target = service.ScopeAdmin
	}
	c.Request.Body = http.MaxBytesReader(c.Writer, c.Request.Body, 1024)
	var input struct {
		UserID int64 `json:"userId"`
	}
	if err := c.ShouldBindJSON(&input); err != nil || input.UserID < 1 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "请先确认已有登录账号"})
		return
	}
	ticket, err := h.service.IssueSSOTicket(c.Request.Context(), scope, cookieValue(c, scope), target, h.ssoPeer(c, scope), input.UserID)
	if err != nil {
		ssoError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"ticket": ticket})
}

func (h *AuthHandler) ssoExchange(c *gin.Context, scope string) {
	c.Header("Cache-Control", "no-store")
	if !secureSameOrigin(c) {
		return
	}
	if h.ssoPeer(c, scope) == "" || c.GetHeader("Origin") != "https://"+c.Request.Host {
		c.JSON(http.StatusForbidden, gin.H{"error": "未授权的单点登录目标"})
		return
	}
	if !strings.HasPrefix(c.GetHeader("Content-Type"), "application/json") {
		c.JSON(http.StatusUnsupportedMediaType, gin.H{"error": "需要 JSON 请求"})
		return
	}
	// 另一个标签页已经登录时，不静默切换为不同账号。
	if _, err := h.service.CurrentUser(c.Request.Context(), scope, cookieValue(c, scope)); err == nil {
		c.JSON(http.StatusConflict, gin.H{"error": "当前页面已登录，请刷新页面"})
		return
	} else if !errors.Is(err, service.ErrUnauthenticated) {
		ssoError(c, err)
		return
	}
	c.Request.Body = http.MaxBytesReader(c.Writer, c.Request.Body, 1024)
	var input struct {
		Ticket string `json:"ticket"`
	}
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "请求格式错误"})
		return
	}
	user, token, err := h.service.ExchangeSSOTicket(c.Request.Context(), input.Ticket, scope, "https://"+c.Request.Host)
	if err != nil {
		ssoError(c, err)
		return
	}
	h.setCookie(c, scope, token, 0)
	c.JSON(http.StatusOK, gin.H{"user": profile(user, scope)})
}

func ssoError(c *gin.Context, err error) {
	switch {
	case errors.Is(err, service.ErrUnauthenticated):
		c.JSON(http.StatusUnauthorized, gin.H{"error": "登录状态或凭证已失效，请重新确认登录"})
	case errors.Is(err, service.ErrForbidden):
		c.JSON(http.StatusForbidden, gin.H{"error": "该账号没有后台访问权限"})
	case errors.Is(err, service.ErrConflict):
		c.JSON(http.StatusConflict, gin.H{"error": "另一端已切换账号，请刷新页面后重新确认"})
	default:
		slog.Error("SSO failed", "error", err)
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "单点登录暂不可用，请使用账号密码登录"})
	}
}
