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

func (h *CommentHandler) PostList(c *gin.Context)        { h.publicList(c, "post") }
func (h *CommentHandler) NoteList(c *gin.Context)        { h.publicList(c, "note") }
func (h *CommentHandler) ThoughtList(c *gin.Context)     { h.publicList(c, "thought") }
func (h *CommentHandler) PostLocation(c *gin.Context)    { h.location(c, "post") }
func (h *CommentHandler) NoteLocation(c *gin.Context)    { h.location(c, "note") }
func (h *CommentHandler) ThoughtLocation(c *gin.Context) { h.location(c, "thought") }

func (h *CommentHandler) location(c *gin.Context, kind string) {
	id, ok := contentID(c)
	if !ok {
		return
	}
	page, err := h.service.PublicPageOf(c.Request.Context(), c.Param("slug"), kind, id)
	if err != nil {
		commentError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"page": page})
}

func (h *CommentHandler) RecentPublic(c *gin.Context) {
	items, err := h.service.RecentPublic(c.Request.Context())
	if err != nil {
		commentError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"items": items})
}

func (h *CommentHandler) publicList(c *gin.Context, kind string) {
	page, err := strconv.Atoi(c.DefaultQuery("page", "1"))
	if err != nil {
		commentError(c, service.ErrInvalidInput)
		return
	}
	items, total, err := h.service.PublicList(c.Request.Context(), c.Param("slug"), kind, page)
	if err != nil {
		commentError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"items": items, "total": total, "page": page, "pageSize": 50})
}

func (h *CommentHandler) PostCreate(c *gin.Context)    { h.create(c, "post") }
func (h *CommentHandler) NoteCreate(c *gin.Context)    { h.create(c, "note") }
func (h *CommentHandler) ThoughtCreate(c *gin.Context) { h.create(c, "thought") }
func (h *CommentHandler) PostMine(c *gin.Context)      { h.mine(c, "post") }
func (h *CommentHandler) NoteMine(c *gin.Context)      { h.mine(c, "note") }
func (h *CommentHandler) ThoughtMine(c *gin.Context)   { h.mine(c, "thought") }
func (h *CommentHandler) PostEdit(c *gin.Context)      { h.edit(c, "post") }
func (h *CommentHandler) NoteEdit(c *gin.Context)      { h.edit(c, "note") }
func (h *CommentHandler) ThoughtEdit(c *gin.Context)   { h.edit(c, "thought") }

func (h *CommentHandler) mine(c *gin.Context, kind string) {
	items, total, err := h.service.Mine(c.Request.Context(), c.Param("slug"), kind, c.GetInt64("userID"))
	if err != nil {
		commentError(c, err)
		return
	}
	c.Header("Cache-Control", "no-store")
	c.JSON(http.StatusOK, gin.H{"items": items, "total": total, "page": 1, "pageSize": 50})
}

func (h *CommentHandler) edit(c *gin.Context, kind string) {
	id, ok := contentID(c)
	if !ok {
		return
	}
	c.Request.Body = http.MaxBytesReader(c.Writer, c.Request.Body, 8192)
	var input struct {
		Body string `json:"body"`
	}
	if err := c.ShouldBindJSON(&input); err != nil {
		commentError(c, service.ErrInvalidInput)
		return
	}
	item, err := h.service.Edit(c.Request.Context(), c.Param("slug"), kind, c.GetInt64("userID"), id, input.Body)
	if err != nil {
		commentError(c, err)
		return
	}
	c.JSON(http.StatusOK, item)
}

func (h *CommentHandler) create(c *gin.Context, kind string) {
	c.Request.Body = http.MaxBytesReader(c.Writer, c.Request.Body, 8192)
	var input model.CommentInput
	if err := c.ShouldBindJSON(&input); err != nil {
		commentError(c, service.ErrInvalidInput)
		return
	}
	item, err := h.service.Create(c.Request.Context(), c.Param("slug"), kind, c.GetInt64("userID"), input)
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

func (h *CommentHandler) SetPinned(c *gin.Context) {
	id, ok := contentID(c)
	if !ok {
		return
	}
	c.Request.Body = http.MaxBytesReader(c.Writer, c.Request.Body, 1024)
	var input struct {
		Pinned *bool `json:"pinned" binding:"required"`
	}
	if err := c.ShouldBindJSON(&input); err != nil || input.Pinned == nil {
		commentError(c, service.ErrInvalidInput)
		return
	}
	item, err := h.service.SetPinned(c.Request.Context(), id, *input.Pinned)
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
	case errors.Is(err, service.ErrCommentNotEditable):
		c.JSON(http.StatusConflict, gin.H{"error": "评论不可编辑或已超过 10 分钟"})
	case errors.Is(err, service.ErrCommentNotPinnable):
		c.JSON(http.StatusConflict, gin.H{"error": "只能置顶已通过审核的一级评论"})
	case errors.Is(err, repository.ErrNotFound):
		c.JSON(http.StatusNotFound, gin.H{"error": "文章或评论不存在"})
	default:
		slog.Error("comment request failed", "error", err)
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "服务暂不可用"})
	}
}
