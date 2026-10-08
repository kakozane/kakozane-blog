package handler

import (
	"errors"
	"log/slog"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/kakozane/kakozane-blog/api/internal/config"
	"github.com/kakozane/kakozane-blog/api/internal/repository"
	"github.com/kakozane/kakozane-blog/api/internal/service"
)

const (
	frontCookie = "__Host-blog-front"
	adminCookie = "__Host-blog-admin"
)

type AuthHandler struct {
	service  *service.AuthService
	ssoSites []config.SSOSite
}

type loginRequest struct {
	Username string `json:"username"`
	Password string `json:"password"`
}

func NewAuthHandler(authService *service.AuthService, sites []config.SSOSite) *AuthHandler {
	return &AuthHandler{service: authService, ssoSites: sites}
}

// FrontLogin 前台认证。
// @Summary 前台认证 - Login
// @Description Cookie 由浏览器自动管理；写操作必须通过同源 HTTPS 发起。
// @Tags 前台认证
// @Produce json
// @Accept json
// @Param body body loginRequest true "账号密码"
// @Success 200 {object} map[string]interface{} "user 信息；仅后台包含 role、permissions"
// @Failure 401,403,426,429,503 {object} map[string]string
// @Router /auth/login [post]
func (h *AuthHandler) FrontLogin(c *gin.Context) { h.login(c, service.ScopeFront) }

// AdminLogin 后台认证。
// @Summary 后台认证 - Login
// @Description Cookie 由浏览器自动管理；写操作必须通过同源 HTTPS 发起。
// @Tags 后台认证
// @Produce json
// @Accept json
// @Param body body loginRequest true "账号密码"
// @Success 200 {object} map[string]interface{} "user 信息；仅后台包含 role、permissions"
// @Failure 401,403,426,429,503 {object} map[string]string
// @Router /admin/auth/login [post]
func (h *AuthHandler) AdminLogin(c *gin.Context) { h.login(c, service.ScopeAdmin) }

// FrontMe 前台认证。
// @Summary 前台认证 - Me
// @Description Cookie 由浏览器自动管理；写操作必须通过同源 HTTPS 发起。
// @Tags 前台认证
// @Produce json
// @Success 200 {object} map[string]interface{} "user 信息；仅后台包含 role、permissions"
// @Failure 401,403,426,429,503 {object} map[string]string
// @Router /auth/me [get]
func (h *AuthHandler) FrontMe(c *gin.Context) { h.me(c, service.ScopeFront) }

// AdminMe 后台认证。
// @Summary 后台认证 - Me
// @Description Cookie 由浏览器自动管理；写操作必须通过同源 HTTPS 发起。
// @Tags 后台认证
// @Produce json
// @Success 200 {object} map[string]interface{} "user 信息；仅后台包含 role、permissions"
// @Failure 401,403,426,429,503 {object} map[string]string
// @Router /admin/auth/me [get]
func (h *AuthHandler) AdminMe(c *gin.Context) { h.me(c, service.ScopeAdmin) }

// FrontLogout 前台认证。
// @Summary 前台认证 - Logout
// @Description Cookie 由浏览器自动管理；写操作必须通过同源 HTTPS 发起。
// @Tags 前台认证
// @Produce json
// @Success 204 "已退出"
// @Failure 401,403,426,429,503 {object} map[string]string
// @Router /auth/logout [post]
func (h *AuthHandler) FrontLogout(c *gin.Context) { h.logout(c, service.ScopeFront) }

// AdminLogout 后台认证。
// @Summary 后台认证 - Logout
// @Description Cookie 由浏览器自动管理；写操作必须通过同源 HTTPS 发起。
// @Tags 后台认证
// @Produce json
// @Success 204 "已退出"
// @Failure 401,403,426,429,503 {object} map[string]string
// @Router /admin/auth/logout [post]
func (h *AuthHandler) AdminLogout(c *gin.Context) { h.logout(c, service.ScopeAdmin) }

func (h *AuthHandler) RequireAdmin(c *gin.Context) {
	if c.Request.Method != http.MethodGet && !secureSameOrigin(c) {
		c.Abort()
		return
	}
	user, err := h.service.CurrentUser(c.Request.Context(), service.ScopeAdmin, cookieValue(c, service.ScopeAdmin))
	if errors.Is(err, service.ErrUnauthenticated) {
		c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "请先登录管理后台"})
		return
	}
	if err != nil {
		slog.Error("admin authorization failed", "error", err)
		c.AbortWithStatusJSON(http.StatusServiceUnavailable, gin.H{"error": "认证暂不可用"})
		return
	}
	c.Set("adminUserID", user.ID)
	c.Set("userID", user.ID)
	c.Next()
}

func (h *AuthHandler) RequireFront(c *gin.Context) {
	if c.Request.Method != http.MethodGet && !secureSameOrigin(c) {
		c.Abort()
		return
	}
	user, err := h.service.CurrentUser(c.Request.Context(), service.ScopeFront, cookieValue(c, service.ScopeFront))
	if errors.Is(err, service.ErrUnauthenticated) {
		c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "请先登录"})
		return
	}
	if err != nil {
		slog.Error("front authorization failed", "error", err)
		c.AbortWithStatusJSON(http.StatusServiceUnavailable, gin.H{"error": "认证暂不可用"})
		return
	}
	c.Set("userID", user.ID)
	c.Next()
}

func (h *AuthHandler) login(c *gin.Context, scope string) {
	c.Header("Cache-Control", "no-store")
	if !secureSameOrigin(c) {
		return
	}
	if !strings.HasPrefix(c.GetHeader("Content-Type"), "application/json") {
		c.JSON(http.StatusUnsupportedMediaType, gin.H{"error": "需要 JSON 请求"})
		return
	}
	c.Request.Body = http.MaxBytesReader(c.Writer, c.Request.Body, 2048)
	var input loginRequest
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "请求格式错误"})
		return
	}
	user, token, err := h.service.Login(c.Request.Context(), input.Username, input.Password, scope)
	if errors.Is(err, service.ErrRateLimited) {
		c.JSON(http.StatusTooManyRequests, gin.H{"error": "尝试次数过多，请 15 分钟后再试"})
		return
	}
	if errors.Is(err, service.ErrInvalidCredentials) {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "账号或密码错误"})
		return
	}
	if err != nil {
		slog.Error("login failed", "error", err)
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "登录暂不可用"})
		return
	}
	h.setCookie(c, scope, token, 0)
	c.JSON(http.StatusOK, gin.H{"user": profile(user, scope)})
}

func (h *AuthHandler) me(c *gin.Context, scope string) {
	c.Header("Cache-Control", "no-store")
	user, err := h.service.CurrentUser(c.Request.Context(), scope, cookieValue(c, scope))
	if errors.Is(err, service.ErrUnauthenticated) {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "请先登录"})
		return
	}
	if err != nil {
		slog.Error("read session failed", "error", err)
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "会话暂不可用"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"user": profile(user, scope)})
}

func (h *AuthHandler) logout(c *gin.Context, scope string) {
	c.Header("Cache-Control", "no-store")
	if !secureSameOrigin(c) {
		return
	}
	if err := h.service.Logout(c.Request.Context(), scope, cookieValue(c, scope)); err != nil {
		slog.Error("logout failed", "error", err)
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "退出暂不可用"})
		return
	}
	h.setCookie(c, scope, "", -1)
	c.Status(http.StatusNoContent)
}

func (h *AuthHandler) setCookie(c *gin.Context, scope, token string, maxAge int) {
	name := frontCookie
	if scope == service.ScopeAdmin {
		name = adminCookie
	}
	http.SetCookie(c.Writer, &http.Cookie{
		Name: name, Value: token, Path: "/", MaxAge: maxAge,
		HttpOnly: true, Secure: true, SameSite: http.SameSiteStrictMode,
	})
}

func cookieValue(c *gin.Context, scope string) string {
	name := frontCookie
	if scope == service.ScopeAdmin {
		name = adminCookie
	}
	value, _ := c.Cookie(name)
	return value
}

func profile(user repository.User, scope string) gin.H {
	result := gin.H{"id": user.ID, "username": user.Username, "displayName": user.DisplayName}
	if scope == service.ScopeAdmin {
		result["role"] = "admin"
		result["permissions"] = []string{"admin:access"}
	}
	return result
}

func secureSameOrigin(c *gin.Context) bool {
	if c.Request.TLS == nil && c.GetHeader("X-Forwarded-Proto") != "https" {
		c.JSON(http.StatusUpgradeRequired, gin.H{"error": "登录需要 HTTPS"})
		return false
	}
	if origin := c.GetHeader("Origin"); origin != "" && origin != "https://"+c.Request.Host {
		c.JSON(http.StatusForbidden, gin.H{"error": "请求来源不匹配"})
		return false
	}
	return true
}
