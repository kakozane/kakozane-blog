package handler

import (
	"github.com/gin-gonic/gin"
	"github.com/kakozane/kakozane-blog/api/internal/model"
	"github.com/kakozane/kakozane-blog/api/internal/service"
	"net/http"
	"strconv"
)

func (h *ContentHandler) Revisions(c *gin.Context) {
	c.Header("Cache-Control", "private, no-store")
	id, ok := contentID(c)
	if !ok {
		return
	}
	items, err := h.service.Revisions(c.Request.Context(), id)
	if err != nil {
		contentError(c, err)
		return
	}
	c.JSON(200, gin.H{"items": items})
}
func (h *ContentHandler) RestorePost(c *gin.Context) {
	c.Header("Cache-Control", "private, no-store")
	id, ok := contentID(c)
	if !ok {
		return
	}
	if err := h.service.RestorePost(c.Request.Context(), id); err != nil {
		contentError(c, err)
		return
	}
	c.Status(204)
}
func (h *ContentHandler) PurgePost(c *gin.Context) {
	c.Header("Cache-Control", "private, no-store")
	id, ok := contentID(c)
	if !ok {
		return
	}
	if err := h.service.PurgePost(c.Request.Context(), id); err != nil {
		contentError(c, err)
		return
	}
	c.Status(204)
}
func (h *ContentHandler) Draft(c *gin.Context) {
	c.Header("Cache-Control", "private, no-store")
	item, err := h.service.Draft(c.Request.Context(), c.GetInt64("adminUserID"), c.Param("key"))
	if err != nil {
		contentError(c, err)
		return
	}
	c.JSON(200, item)
}
func (h *ContentHandler) SaveDraft(c *gin.Context) {
	c.Header("Cache-Control", "private, no-store")
	c.Request.Body = http.MaxBytesReader(c.Writer, c.Request.Body, 2*1024*1024)
	var input model.WritingDraft
	if c.ShouldBindJSON(&input) != nil {
		contentError(c, service.ErrInvalidInput)
		return
	}
	item, err := h.service.SaveDraft(c.Request.Context(), c.GetInt64("adminUserID"), c.Param("key"), input)
	if err != nil {
		contentError(c, err)
		return
	}
	c.JSON(200, item)
}
func (h *ContentHandler) DeleteDraft(c *gin.Context) {
	c.Header("Cache-Control", "private, no-store")
	version, err := strconv.ParseInt(c.Query("version"), 10, 64)
	if err != nil {
		contentError(c, service.ErrInvalidInput)
		return
	}
	if err = h.service.DeleteDraft(c.Request.Context(), c.GetInt64("adminUserID"), c.Param("key"), version); err != nil {
		contentError(c, err)
		return
	}
	c.Status(204)
}
