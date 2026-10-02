package handler

import (
	"errors"
	"log/slog"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/kakozane/kakozane-blog/api/internal/model"
	"github.com/kakozane/kakozane-blog/api/internal/repository"
	"github.com/kakozane/kakozane-blog/api/internal/service"
)

type FriendHandler struct{ service *service.FriendService }

func NewFriendHandler(friendService *service.FriendService) *FriendHandler {
	return &FriendHandler{service: friendService}
}

func (h *FriendHandler) PublicList(c *gin.Context) { h.list(c, true) }
func (h *FriendHandler) AdminList(c *gin.Context)  { h.list(c, false) }

func (h *FriendHandler) list(c *gin.Context, publicOnly bool) {
	items, err := h.service.List(c.Request.Context(), publicOnly)
	if err != nil {
		linkError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"items": items})
}

func (h *FriendHandler) Create(c *gin.Context) { h.save(c, 0) }

func (h *FriendHandler) Update(c *gin.Context) {
	id, ok := contentID(c)
	if ok {
		h.save(c, id)
	}
}

func (h *FriendHandler) save(c *gin.Context, id int64) {
	c.Request.Body = http.MaxBytesReader(c.Writer, c.Request.Body, 4096)
	var input model.FriendLink
	if err := c.ShouldBindJSON(&input); err != nil {
		linkError(c, service.ErrInvalidInput)
		return
	}
	item, err := h.service.Save(c.Request.Context(), id, input)
	if err != nil {
		linkError(c, err)
		return
	}
	status := http.StatusOK
	if id == 0 {
		status = http.StatusCreated
	}
	c.JSON(status, item)
}

func (h *FriendHandler) Delete(c *gin.Context) {
	id, ok := contentID(c)
	if !ok {
		return
	}
	if err := h.service.Delete(c.Request.Context(), id); err != nil {
		linkError(c, err)
		return
	}
	c.Status(http.StatusNoContent)
}

func linkError(c *gin.Context, err error) {
	switch {
	case errors.Is(err, repository.ErrNotFound):
		c.JSON(http.StatusNotFound, gin.H{"error": "链接不存在"})
	case errors.Is(err, service.ErrInvalidInput):
		c.JSON(http.StatusBadRequest, gin.H{"error": "请检查名称、HTTPS 链接及排序"})
	default:
		slog.Error("external link request failed", "error", err)
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "服务暂不可用"})
	}
}
