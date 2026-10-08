package handler

import (
	"github.com/gin-gonic/gin"
	"github.com/kakozane/kakozane-blog/api/internal/service"
	"strconv"
)

func (h *CommentHandler) Notifications(c *gin.Context) {
	c.Header("Cache-Control", "private, no-store")
	page, err := strconv.Atoi(c.DefaultQuery("page", "1"))
	if err != nil {
		contentError(c, service.ErrInvalidInput)
		return
	}
	items, unread, err := h.service.Notifications(c.Request.Context(), c.GetInt64("userID"), page)
	if err != nil {
		contentError(c, err)
		return
	}
	c.JSON(200, gin.H{"items": items, "unread": unread})
}
func (h *CommentHandler) ReadNotification(c *gin.Context) {
	c.Header("Cache-Control", "private, no-store")
	id, ok := contentID(c)
	if !ok {
		return
	}
	if err := h.service.ReadNotification(c.Request.Context(), c.GetInt64("userID"), id); err != nil {
		contentError(c, err)
		return
	}
	c.Status(204)
}
