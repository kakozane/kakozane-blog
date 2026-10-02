package handler

import (
	"errors"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/kakozane/kakozane-blog/api/internal/model"
	"github.com/kakozane/kakozane-blog/api/internal/service"
)

type PageHandler struct{ service *service.PageService }

func NewPageHandler(pageService *service.PageService) *PageHandler {
	return &PageHandler{service: pageService}
}

func (h *PageHandler) PublicList(c *gin.Context) {
	if keyword := c.Query("q"); keyword != "" {
		items, err := h.service.Search(c.Request.Context(), keyword)
		if errors.Is(err, service.ErrInvalidInput) {
			c.JSON(http.StatusBadRequest, gin.H{"error": "搜索词过长"})
			return
		}
		if err != nil {
			contentError(c, err)
			return
		}
		c.JSON(http.StatusOK, gin.H{"items": items})
		return
	}
	h.list(c, true)
}
func (h *PageHandler) AdminList(c *gin.Context) { h.list(c, false) }

func (h *PageHandler) list(c *gin.Context, publicOnly bool) {
	items, err := h.service.List(c.Request.Context(), publicOnly)
	if err != nil {
		contentError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"items": items})
}

func (h *PageHandler) PublicGet(c *gin.Context) {
	item, err := h.service.PublishedBySlug(c.Request.Context(), c.Param("slug"))
	if err != nil {
		contentError(c, err)
		return
	}
	c.JSON(http.StatusOK, item)
}

func (h *PageHandler) AdminGet(c *gin.Context) {
	id, ok := contentID(c)
	if !ok {
		return
	}
	item, err := h.service.Get(c.Request.Context(), id)
	if err != nil {
		contentError(c, err)
		return
	}
	c.JSON(http.StatusOK, item)
}

func (h *PageHandler) Create(c *gin.Context) { h.save(c, 0) }
func (h *PageHandler) Update(c *gin.Context) {
	id, ok := contentID(c)
	if ok {
		h.save(c, id)
	}
}

func (h *PageHandler) save(c *gin.Context, id int64) {
	c.Request.Body = http.MaxBytesReader(c.Writer, c.Request.Body, 2<<20)
	var input model.Page
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "页面格式错误或内容过大"})
		return
	}
	item, err := h.service.Save(c.Request.Context(), id, input)
	if err != nil {
		if errors.Is(err, service.ErrInvalidInput) {
			c.JSON(http.StatusBadRequest, gin.H{"error": "请检查页面标题、链接、摘要和正文"})
			return
		}
		contentError(c, err)
		return
	}
	status := http.StatusOK
	if id == 0 {
		status = http.StatusCreated
	}
	c.JSON(status, item)
}

func (h *PageHandler) Delete(c *gin.Context) {
	id, ok := contentID(c)
	if !ok {
		return
	}
	if err := h.service.Delete(c.Request.Context(), id); err != nil {
		contentError(c, err)
		return
	}
	c.Status(http.StatusNoContent)
}
