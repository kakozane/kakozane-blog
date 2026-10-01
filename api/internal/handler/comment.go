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

type CommentHandler struct{ service *service.CommentService }

func NewCommentHandler(commentService *service.CommentService) *CommentHandler {
	return &CommentHandler{service: commentService}
}

func (h *CommentHandler) PublicList(c *gin.Context) {
	page, err := strconv.Atoi(c.DefaultQuery("page", "1"))
	if err != nil {
		commentError(c, service.ErrInvalidInput)
		return
	}
	items, total, err := h.service.PublicList(c.Request.Context(), c.Param("slug"), page)
	if err != nil {
		commentError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"items": items, "total": total, "page": page, "pageSize": 50})
}

func (h *CommentHandler) Create(c *gin.Context) {
	c.Request.Body = http.MaxBytesReader(c.Writer, c.Request.Body, 8192)
	var input model.CommentInput
	if err := c.ShouldBindJSON(&input); err != nil {
		commentError(c, service.ErrInvalidInput)
		return
	}
	item, err := h.service.Create(c.Request.Context(), c.Param("slug"), c.GetInt64("userID"), input)
	if err != nil {
		commentError(c, err)
		return
	}
	c.JSON(http.StatusCreated, item)
}

func (h *CommentHandler) AdminList(c *gin.Context) {
	page, err := strconv.Atoi(c.DefaultQuery("page", "1"))
	if err != nil {
		commentError(c, service.ErrInvalidInput)
		return
	}
	items, total, err := h.service.AdminList(c.Request.Context(), c.Query("status"), page)
	if err != nil {
		commentError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"items": items, "total": total, "page": page, "pageSize": 20})
}

func (h *CommentHandler) SetStatus(c *gin.Context) {
	id, ok := contentID(c)
	if !ok {
		return
	}
	c.Request.Body = http.MaxBytesReader(c.Writer, c.Request.Body, 1024)
	var input struct {
		Status string `json:"status"`
	}
	if err := c.ShouldBindJSON(&input); err != nil {
		commentError(c, service.ErrInvalidInput)
		return
	}
	item, err := h.service.SetStatus(c.Request.Context(), id, input.Status)
	if err != nil {
		commentError(c, err)
		return
	}
	c.JSON(http.StatusOK, item)
}

func (h *CommentHandler) Delete(c *gin.Context) {
	id, ok := contentID(c)
	if !ok {
		return
	}
	if err := h.service.Delete(c.Request.Context(), id); err != nil {
		commentError(c, err)
		return
	}
	c.Status(http.StatusNoContent)
}

func commentError(c *gin.Context, err error) {
	switch {
	case errors.Is(err, service.ErrInvalidInput):
		c.JSON(http.StatusBadRequest, gin.H{"error": "评论内容或状态无效"})
	case errors.Is(err, service.ErrCommentCooldown):
		c.JSON(http.StatusTooManyRequests, gin.H{"error": "评论太频繁，请 30 秒后再试"})
	case errors.Is(err, repository.ErrNotFound):
		c.JSON(http.StatusNotFound, gin.H{"error": "文章或评论不存在"})
	default:
		slog.Error("comment request failed", "error", err)
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "服务暂不可用"})
	}
}
