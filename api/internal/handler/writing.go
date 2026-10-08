package handler

import (
	"github.com/gin-gonic/gin"
	"github.com/kakozane/kakozane-blog/api/internal/model"
	"github.com/kakozane/kakozane-blog/api/internal/service"
	"net/http"
	"strconv"
)

// Revisions 写作工作流。
// @Summary Revisions（需后台登录）
// @Tags 草稿与版本
// @Produce json
// @Param id path int true "文章 ID"
// @Success 200 {object} object{items=[]model.Revision}
// @Failure 400,401,403,404,409,503 {object} map[string]string
// @Router /admin/posts/{id}/revisions [get]
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

// RestorePost 写作工作流。
// @Summary RestorePost（需后台登录）
// @Tags 草稿与版本
// @Produce json
// @Param id path int true "文章 ID"
// @Success 204 "操作成功"
// @Failure 400,401,403,404,409,503 {object} map[string]string
// @Router /admin/posts/{id}/restore [post]
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

// PurgePost 写作工作流。
// @Summary PurgePost（需后台登录）
// @Tags 草稿与版本
// @Produce json
// @Param id path int true "文章 ID"
// @Success 204 "操作成功"
// @Failure 400,401,403,404,409,503 {object} map[string]string
// @Router /admin/posts/{id}/purge [delete]
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

// Draft 写作工作流。
// @Summary Draft（需后台登录）
// @Tags 草稿与版本
// @Produce json
// @Param key path string true "post-ID、note-ID、post-new 或 note-new"
// @Success 200 {object} model.WritingDraft
// @Failure 400,401,403,404,409,503 {object} map[string]string
// @Router /admin/drafts/{key} [get]
func (h *ContentHandler) Draft(c *gin.Context) {
	c.Header("Cache-Control", "private, no-store")
	item, err := h.service.Draft(c.Request.Context(), c.GetInt64("adminUserID"), c.Param("key"))
	if err != nil {
		contentError(c, err)
		return
	}
	c.JSON(200, item)
}

// SaveDraft 写作工作流。
// @Summary SaveDraft（需后台登录）
// @Tags 草稿与版本
// @Produce json
// @Param key path string true "post-ID、note-ID、post-new 或 note-new"
// @Accept json
// @Param body body model.WritingDraft true "携带当前草稿 version，首次为 0"
// @Success 200 {object} model.WritingDraft
// @Failure 400,401,403,404,409,503 {object} map[string]string
// @Router /admin/drafts/{key} [put]
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

// DeleteDraft 写作工作流。
// @Summary DeleteDraft（需后台登录）
// @Tags 草稿与版本
// @Produce json
// @Param key path string true "post-ID、note-ID、post-new 或 note-new"
// @Param version query int true "当前草稿版本"
// @Success 204 "操作成功"
// @Failure 400,401,403,404,409,503 {object} map[string]string
// @Router /admin/drafts/{key} [delete]
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
