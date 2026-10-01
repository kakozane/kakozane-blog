package handler

import (
	"errors"
	"log/slog"
	"net"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/kakozane/kakozane-blog/api/internal/model"
	"github.com/kakozane/kakozane-blog/api/internal/repository"
	"github.com/kakozane/kakozane-blog/api/internal/service"
)

type UserHandler struct{ service *service.UserService }

func NewUserHandler(userService *service.UserService) *UserHandler {
	return &UserHandler{service: userService}
}

func (h *UserHandler) Register(c *gin.Context) {
	if !secureSameOrigin(c) {
		return
	}
	c.Request.Body = http.MaxBytesReader(c.Writer, c.Request.Body, 4096)
	var input model.UserInput
	if err := c.ShouldBindJSON(&input); err != nil {
		userError(c, service.ErrInvalidInput)
		return
	}
	ip := c.GetHeader("X-Real-IP")
	if net.ParseIP(ip) == nil {
		ip, _, _ = net.SplitHostPort(c.Request.RemoteAddr)
	}
	user, err := h.service.Register(c.Request.Context(), input, ip)
	if err != nil {
		userError(c, err)
		return
	}
	c.JSON(http.StatusCreated, gin.H{"id": user.ID, "username": user.Username, "displayName": user.DisplayName})
}

func (h *UserHandler) List(c *gin.Context) {
	page, err := strconv.Atoi(c.DefaultQuery("page", "1"))
	if err != nil {
		userError(c, service.ErrInvalidInput)
		return
	}
	pageSize, err := strconv.Atoi(c.DefaultQuery("pageSize", "10"))
	if err != nil {
		userError(c, service.ErrInvalidInput)
		return
	}
	items, total, err := h.service.List(c.Request.Context(), page, pageSize, c.Query("q"))
	if err != nil {
		userError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"items": items, "total": total, "page": page, "pageSize": pageSize})
}

func (h *UserHandler) Create(c *gin.Context) {
	c.Request.Body = http.MaxBytesReader(c.Writer, c.Request.Body, 4096)
	var input model.UserInput
	if err := c.ShouldBindJSON(&input); err != nil {
		userError(c, service.ErrInvalidInput)
		return
	}
	user, err := h.service.Create(c.Request.Context(), input)
	if err != nil {
		userError(c, err)
		return
	}
	c.JSON(http.StatusCreated, user)
}

func (h *UserHandler) Update(c *gin.Context) {
	id, ok := contentID(c)
	if !ok {
		return
	}
	c.Request.Body = http.MaxBytesReader(c.Writer, c.Request.Body, 4096)
	var input model.UserUpdate
	if err := c.ShouldBindJSON(&input); err != nil {
		userError(c, service.ErrInvalidInput)
		return
	}
	user, err := h.service.Update(c.Request.Context(), id, input)
	if err != nil {
		userError(c, err)
		return
	}
	c.JSON(http.StatusOK, user)
}

func (h *UserHandler) ResetPassword(c *gin.Context) {
	id, ok := contentID(c)
	if !ok {
		return
	}
	secret, err := h.service.ResetPassword(c.Request.Context(), id)
	if err != nil {
		userError(c, err)
		return
	}
	c.Header("Cache-Control", "no-store")
	c.JSON(http.StatusOK, gin.H{"password": secret})
}

func (h *UserHandler) Delete(c *gin.Context) {
	id, ok := contentID(c)
	if !ok {
		return
	}
	if err := h.service.Delete(c.Request.Context(), id); err != nil {
		userError(c, err)
		return
	}
	c.Status(http.StatusNoContent)
}

func (h *UserHandler) UpdateProfile(c *gin.Context) {
	c.Request.Body = http.MaxBytesReader(c.Writer, c.Request.Body, 4096)
	var input struct {
		DisplayName string `json:"displayName"`
	}
	if err := c.ShouldBindJSON(&input); err != nil {
		userError(c, service.ErrInvalidInput)
		return
	}
	user, err := h.service.UpdateProfile(c.Request.Context(), c.GetInt64("userID"), input.DisplayName)
	if err != nil {
		userError(c, err)
		return
	}
	c.Header("Cache-Control", "no-store")
	c.JSON(http.StatusOK, gin.H{"id": user.ID, "username": user.Username, "displayName": user.DisplayName})
}

func (h *UserHandler) ChangePassword(c *gin.Context) {
	c.Request.Body = http.MaxBytesReader(c.Writer, c.Request.Body, 4096)
	var input struct {
		OldPassword string `json:"oldPassword"`
		NewPassword string `json:"newPassword"`
	}
	if err := c.ShouldBindJSON(&input); err != nil {
		userError(c, service.ErrInvalidInput)
		return
	}
	if err := h.service.ChangePassword(c.Request.Context(), c.GetInt64("userID"), input.OldPassword, input.NewPassword); err != nil {
		userError(c, err)
		return
	}
	c.Status(http.StatusNoContent)
}

func userError(c *gin.Context, err error) {
	switch {
	case errors.Is(err, service.ErrInvalidInput):
		c.JSON(http.StatusBadRequest, gin.H{"error": "请检查账号、昵称、密码和身份"})
	case errors.Is(err, service.ErrInvalidCredentials):
		c.JSON(http.StatusUnauthorized, gin.H{"error": "原密码错误"})
	case errors.Is(err, service.ErrRegistrationRateLimited):
		c.JSON(http.StatusTooManyRequests, gin.H{"error": "注册太频繁，请一小时后再试"})
	case errors.Is(err, service.ErrConflict):
		c.JSON(http.StatusConflict, gin.H{"error": "账号已存在，或该用户仍有关联内容"})
	case errors.Is(err, repository.ErrNotFound):
		c.JSON(http.StatusNotFound, gin.H{"error": "用户不存在"})
	case errors.Is(err, repository.ErrLastAdmin):
		c.JSON(http.StatusConflict, gin.H{"error": "不能禁用最后一位管理员"})
	default:
		slog.Error("user request failed", "error", err)
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "服务暂不可用"})
	}
}
