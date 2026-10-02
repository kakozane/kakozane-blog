package handler

import (
	"errors"
	"log/slog"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/kakozane/kakozane-blog/api/internal/model"
	"github.com/kakozane/kakozane-blog/api/internal/repository"
	"github.com/kakozane/kakozane-blog/api/internal/service"
)

type LikeHandler struct {
	likes *service.LikeService
	auth  *service.AuthService
}

func NewLikeHandler(likes *service.LikeService, auth *service.AuthService) *LikeHandler {
	return &LikeHandler{likes: likes, auth: auth}
}

func (h *LikeHandler) Post(c *gin.Context)    { h.handle(c, "post") }
func (h *LikeHandler) Note(c *gin.Context)    { h.handle(c, "note") }
func (h *LikeHandler) Thought(c *gin.Context) { h.handle(c, "thought") }

func (h *LikeHandler) RecentPublic(c *gin.Context) {
	items, err := h.likes.RecentPublic(c.Request.Context())
	if err != nil {
		slog.Error("recent likes failed", "error", err)
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "暂时无法读取点赞动态"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"items": items})
}

func (h *LikeHandler) Mine(c *gin.Context) {
	c.Header("Cache-Control", "no-store")
	page, err := strconv.Atoi(c.DefaultQuery("page", "1"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "页码无效"})
		return
	}
	items, total, err := h.likes.Mine(c.Request.Context(), c.GetInt64("userID"), page)
	if err != nil {
		if errors.Is(err, service.ErrInvalidInput) {
			c.JSON(http.StatusBadRequest, gin.H{"error": "页码无效"})
			return
		}
		slog.Error("list my likes failed", "error", err)
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "暂时无法读取喜欢的内容"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"items": items, "total": total, "page": page, "pageSize": 20})
}

func (h *LikeHandler) handle(c *gin.Context, kind string) {
	c.Header("Cache-Control", "no-store")
	userID := c.GetInt64("userID")
	if c.Request.Method == http.MethodGet {
		user, err := h.auth.CurrentUser(c.Request.Context(), service.ScopeFront, cookieValue(c, service.ScopeFront))
		if err == nil {
			userID = user.ID
		} else if !errors.Is(err, service.ErrUnauthenticated) {
			slog.Error("read like session failed", "error", err)
			c.JSON(http.StatusServiceUnavailable, gin.H{"error": "暂时无法读取点赞"})
			return
		}
	}
	var state model.LikeState
	var err error
	switch c.Request.Method {
	case http.MethodGet:
		state, err = h.likes.State(c.Request.Context(), c.Param("slug"), kind, userID)
	case http.MethodPut, http.MethodDelete:
		state, err = h.likes.Set(c.Request.Context(), c.Param("slug"), kind, userID, c.Request.Method == http.MethodPut)
	default:
		c.Status(http.StatusMethodNotAllowed)
		return
	}
	if err != nil {
		if errors.Is(err, repository.ErrNotFound) || errors.Is(err, service.ErrInvalidInput) {
			contentError(c, err)
			return
		}
		slog.Error("like request failed", "error", err)
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "暂时无法更新点赞"})
		return
	}
	c.JSON(http.StatusOK, state)
}
