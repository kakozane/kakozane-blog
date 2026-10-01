package handler

import (
	"errors"
	"log/slog"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/kakozane/kakozane-blog/api/internal/repository"
	"github.com/kakozane/kakozane-blog/api/internal/service"
)

type MediaHandler struct{ service *service.MediaService }

func NewMediaHandler(mediaService *service.MediaService) *MediaHandler {
	return &MediaHandler{service: mediaService}
}

func (h *MediaHandler) List(c *gin.Context) {
	page, err := strconv.Atoi(c.DefaultQuery("page", "1"))
	if err != nil {
		mediaError(c, service.ErrInvalidInput)
		return
	}
	items, total, err := h.service.List(c.Request.Context(), page)
	if err != nil {
		mediaError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"items": items, "total": total, "page": page, "pageSize": 40})
}

func (h *MediaHandler) Upload(c *gin.Context) {
	c.Request.Body = http.MaxBytesReader(c.Writer, c.Request.Body, 6<<20)
	file, err := c.FormFile("file")
	if err != nil || file.Size > 5<<20 {
		mediaError(c, service.ErrInvalidInput)
		return
	}
	reader, err := file.Open()
	if err != nil {
		mediaError(c, err)
		return
	}
	defer reader.Close()
	item, err := h.service.Upload(c.Request.Context(), c.GetInt64("adminUserID"), reader)
	if err != nil {
		mediaError(c, err)
		return
	}
	c.JSON(http.StatusCreated, item)
}

func (h *MediaHandler) Delete(c *gin.Context) {
	id, ok := contentID(c)
	if !ok {
		return
	}
	if err := h.service.Delete(c.Request.Context(), id); err != nil {
		mediaError(c, err)
		return
	}
	c.Status(http.StatusNoContent)
}

func mediaError(c *gin.Context, err error) {
	switch {
	case errors.Is(err, service.ErrInvalidInput):
		c.JSON(http.StatusBadRequest, gin.H{"error": "仅支持 5 MB 内的 JPEG、PNG、GIF 或 WebP 图片"})
	case errors.Is(err, repository.ErrNotFound):
		c.JSON(http.StatusNotFound, gin.H{"error": "图片不存在"})
	default:
		slog.Error("media request failed", "error", err)
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "图片服务暂不可用"})
	}
}
