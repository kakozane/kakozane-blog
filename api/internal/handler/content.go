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

type ContentHandler struct{ service *service.ContentService }

func NewContentHandler(contentService *service.ContentService) *ContentHandler {
	return &ContentHandler{service: contentService}
}

func (h *ContentHandler) PublicationStats(c *gin.Context) {
	stats, err := h.service.PublicationStats(c.Request.Context())
	if err != nil {
		contentError(c, err)
		return
	}
	c.JSON(http.StatusOK, stats)
}

func (h *ContentHandler) ListPosts(c *gin.Context)    { h.listPosts(c, true, "post") }
func (h *ContentHandler) ListNotes(c *gin.Context)    { h.listPosts(c, true, "note") }
func (h *ContentHandler) ListThoughts(c *gin.Context) { h.listPosts(c, true, "thought") }
func (h *ContentHandler) ListNoteSeries(c *gin.Context) {
	items, err := h.service.ListNoteSeries(c.Request.Context())
	if err != nil {
		contentError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"items": items})
}
func (h *ContentHandler) ListTimeline(c *gin.Context) {
	kind := c.DefaultQuery("kind", "all")
	if kind == "all" && c.Query("featured") == "1" {
		kind = "note"
	}
	h.listPosts(c, true, kind)
}
func (h *ContentHandler) TimelineYears(c *gin.Context) {
	years, err := h.service.TimelineYears(c.Request.Context(), c.Query("featured") == "1")
	if err != nil {
		contentError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"years": years})
}
func (h *ContentHandler) TimelineMonths(c *gin.Context) {
	months, err := h.service.MonthlyActivity(c.Request.Context())
	if err != nil {
		contentError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"months": months})
}
func (h *ContentHandler) ListAdminPosts(c *gin.Context) {
	h.listPosts(c, false, c.DefaultQuery("kind", "all"))
}

func (h *ContentHandler) listPosts(c *gin.Context, publishedOnly bool, kind string) {
	page, pageErr := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, sizeErr := strconv.Atoi(c.DefaultQuery("pageSize", "10"))
	year, yearErr := strconv.Atoi(c.DefaultQuery("year", "0"))
	if pageErr != nil || sizeErr != nil || yearErr != nil {
		contentError(c, service.ErrInvalidInput)
		return
	}
	filter := model.PostFilter{
		PublishedOnly: publishedOnly, PinnedFirst: publishedOnly && kind == "post" && c.Query("pinFirst") == "1",
		FeaturedOnly: publishedOnly && c.Query("featured") == "1",
		Kind:         kind, Status: c.Query("status"), Query: c.Query("q"),
		CategorySlug: c.Query("category"), TagSlug: c.Query("tag"), Year: year, Month: c.Query("month"), Sort: c.Query("sort"), Page: page, PageSize: pageSize,
	}
	items, total, err := h.service.ListPosts(c.Request.Context(), filter)
	if err != nil {
		contentError(c, err)
		return
	}
	if page < 1 {
		page = 1
	}
	if pageSize < 1 || pageSize > 50 {
		pageSize = 10
	}
	c.JSON(http.StatusOK, gin.H{"items": items, "total": total, "page": page, "pageSize": pageSize})
}

func (h *ContentHandler) GetPost(c *gin.Context)         { h.getPublished(c, "post") }
func (h *ContentHandler) GetNote(c *gin.Context)         { h.getPublished(c, "note") }
func (h *ContentHandler) GetThought(c *gin.Context)      { h.getPublished(c, "thought") }
func (h *ContentHandler) RelatedPosts(c *gin.Context)    { h.related(c, "post") }
func (h *ContentHandler) RelatedNotes(c *gin.Context)    { h.related(c, "note") }
func (h *ContentHandler) RelatedThoughts(c *gin.Context) { h.related(c, "thought") }

func (h *ContentHandler) related(c *gin.Context, kind string) {
	connections, err := h.service.RelatedPosts(c.Request.Context(), c.Param("slug"), kind)
	if err != nil {
		contentError(c, err)
		return
	}
	c.JSON(http.StatusOK, connections)
}

func (h *ContentHandler) getPublished(c *gin.Context, kind string) {
	item, err := h.service.PublishedPostBySlug(c.Request.Context(), c.Param("slug"))
	if err != nil {
		contentError(c, err)
		return
	}
	if item.Kind != kind {
		contentError(c, repository.ErrNotFound)
		return
	}
	c.JSON(http.StatusOK, item)
}

func (h *ContentHandler) GetAdminPost(c *gin.Context) {
	id, ok := contentID(c)
	if !ok {
		return
	}
	item, err := h.service.PostByID(c.Request.Context(), id)
	if err != nil {
		contentError(c, err)
		return
	}
	c.JSON(http.StatusOK, item)
}

func (h *ContentHandler) CreatePost(c *gin.Context) { h.savePost(c, 0) }

func (h *ContentHandler) UpdatePost(c *gin.Context) {
	id, ok := contentID(c)
	if ok {
		h.savePost(c, id)
	}
}

func (h *ContentHandler) savePost(c *gin.Context, id int64) {
	c.Request.Body = http.MaxBytesReader(c.Writer, c.Request.Body, 2<<20)
	var input model.PostInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "文章格式错误或内容过大"})
		return
	}
	item, err := h.service.SavePost(c.Request.Context(), id, c.GetInt64("adminUserID"), input)
	if err != nil {
		contentError(c, err)
		return
	}
	status := http.StatusOK
	if id == 0 {
		status = http.StatusCreated
	}
	c.JSON(status, item)
}

func (h *ContentHandler) DeletePost(c *gin.Context) {
	id, ok := contentID(c)
	if !ok {
		return
	}
	if err := h.service.DeletePost(c.Request.Context(), id); err != nil {
		contentError(c, err)
		return
	}
	c.Status(http.StatusNoContent)
}

func (h *ContentHandler) ListCategories(c *gin.Context)      { h.listTerms(c, "categories", true) }
func (h *ContentHandler) ListTags(c *gin.Context)            { h.listTerms(c, "tags", true) }
func (h *ContentHandler) ListAdminCategories(c *gin.Context) { h.listTerms(c, "categories", false) }
func (h *ContentHandler) ListAdminTags(c *gin.Context)       { h.listTerms(c, "tags", false) }

func (h *ContentHandler) listTerms(c *gin.Context, kind string, publicOnly bool) {
	items, err := h.service.ListTerms(c.Request.Context(), kind, publicOnly)
	if err != nil {
		contentError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"items": items})
}

func (h *ContentHandler) CreateCategory(c *gin.Context) { h.saveTerm(c, "categories", 0) }
func (h *ContentHandler) CreateTag(c *gin.Context)      { h.saveTerm(c, "tags", 0) }
func (h *ContentHandler) UpdateCategory(c *gin.Context) { h.updateTerm(c, "categories") }
func (h *ContentHandler) UpdateTag(c *gin.Context)      { h.updateTerm(c, "tags") }
func (h *ContentHandler) DeleteCategory(c *gin.Context) { h.deleteTerm(c, "categories") }
func (h *ContentHandler) DeleteTag(c *gin.Context)      { h.deleteTerm(c, "tags") }

func (h *ContentHandler) updateTerm(c *gin.Context, kind string) {
	id, ok := contentID(c)
	if ok {
		h.saveTerm(c, kind, id)
	}
}

func (h *ContentHandler) saveTerm(c *gin.Context, kind string, id int64) {
	c.Request.Body = http.MaxBytesReader(c.Writer, c.Request.Body, 4096)
	var input model.Term
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "分类或标签格式错误"})
		return
	}
	savedID, err := h.service.SaveTerm(c.Request.Context(), kind, id, input)
	if err != nil {
		contentError(c, err)
		return
	}
	status := http.StatusOK
	if id == 0 {
		status = http.StatusCreated
	}
	c.JSON(status, gin.H{"id": savedID, "name": input.Name, "slug": input.Slug})
}

func (h *ContentHandler) deleteTerm(c *gin.Context, kind string) {
	id, ok := contentID(c)
	if !ok {
		return
	}
	if err := h.service.DeleteTerm(c.Request.Context(), kind, id); err != nil {
		contentError(c, err)
		return
	}
	c.Status(http.StatusNoContent)
}

func contentID(c *gin.Context) (int64, bool) {
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil || id < 1 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "无效的 ID"})
		return 0, false
	}
	return id, true
}

func contentError(c *gin.Context, err error) {
	switch {
	case errors.Is(err, repository.ErrStaleVersion):
		c.JSON(http.StatusConflict, gin.H{"error": "内容已在其他窗口更新，请先重新载入，当前草稿仍保留"})
	case errors.Is(err, repository.ErrNotFound):
		c.JSON(http.StatusNotFound, gin.H{"error": "内容不存在"})
	case errors.Is(err, service.ErrInvalidInput):
		c.JSON(http.StatusBadRequest, gin.H{"error": "请检查标题、链接、正文及关联分类标签"})
	case errors.Is(err, service.ErrConflict):
		c.JSON(http.StatusConflict, gin.H{"error": "链接已被使用"})
	default:
		slog.Error("content request failed", "error", err)
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "服务暂不可用"})
	}
}
