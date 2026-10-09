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

// ListPosts 内容列表。
// @Summary 已发布内容列表
// @Tags 公开内容
// @Produce json
// @Param page query int false "页码" default(1)
// @Param pageSize query int false "每页数量，1～50" default(10)
// @Param q query string false "搜索关键词"
// @Param category query string false "分类 slug"
// @Param tag query string false "标签 slug"
// @Param year query int false "年份"
// @Param month query string false "月份 YYYY-MM"
// @Param sort query string false "默认最新" Enums(oldest,updated)
// @Param pinFirst query string false "1 表示文章置顶优先"
// @Param featured query string false "1 表示精选"
// @Success 200 {object} object{items=[]model.Post,total=int,page=int,pageSize=int}
// @Failure 400,401,503 {object} map[string]string
// @Router /posts [get]
func (h *ContentHandler) ListPosts(c *gin.Context) { h.listPosts(c, true, "post") }

// ListNotes 内容列表。
// @Summary 已发布内容列表
// @Tags 公开内容
// @Produce json
// @Param page query int false "页码" default(1)
// @Param pageSize query int false "每页数量，1～50" default(10)
// @Param q query string false "搜索关键词"
// @Param category query string false "分类 slug"
// @Param tag query string false "标签 slug"
// @Param year query int false "年份"
// @Param month query string false "月份 YYYY-MM"
// @Param sort query string false "默认最新" Enums(oldest,updated)
// @Param pinFirst query string false "1 表示文章置顶优先"
// @Param featured query string false "1 表示精选"
// @Success 200 {object} object{items=[]model.Post,total=int,page=int,pageSize=int}
// @Failure 400,401,503 {object} map[string]string
// @Router /notes [get]
func (h *ContentHandler) ListNotes(c *gin.Context) { h.listPosts(c, true, "note") }

// ListThoughts 内容列表。
// @Summary 已发布内容列表
// @Tags 公开内容
// @Produce json
// @Param page query int false "页码" default(1)
// @Param pageSize query int false "每页数量，1～50" default(10)
// @Param q query string false "搜索关键词"
// @Param category query string false "分类 slug"
// @Param tag query string false "标签 slug"
// @Param year query int false "年份"
// @Param month query string false "月份 YYYY-MM"
// @Param sort query string false "默认最新" Enums(oldest,updated)
// @Param pinFirst query string false "1 表示文章置顶优先"
// @Param featured query string false "1 表示精选"
// @Success 200 {object} object{items=[]model.Post,total=int,page=int,pageSize=int}
// @Failure 400,401,503 {object} map[string]string
// @Router /thinking [get]
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

// ListAdminPosts 内容列表。
// @Summary 后台内容列表（需后台登录）
// @Tags 文章管理
// @Produce json
// @Param page query int false "页码" default(1)
// @Param pageSize query int false "每页数量，1～50" default(10)
// @Param q query string false "搜索关键词"
// @Param category query string false "分类 slug"
// @Param tag query string false "标签 slug"
// @Param year query int false "年份"
// @Param month query string false "月份 YYYY-MM"
// @Param kind query string false "内容类型" Enums(all,post,note,thought)
// @Param status query string false "状态；trash 为回收站"
// @Success 200 {object} object{items=[]model.Post,total=int,page=int,pageSize=int}
// @Failure 400,401,503 {object} map[string]string
// @Router /admin/posts [get]
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
		PublishedOnly: publishedOnly, PinnedFirst: publishedOnly && (kind == "post" || kind == "all") && c.Query("pinFirst") == "1",
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

// GetPost 内容详情。
// @Summary 内容详情
// @Tags 公开内容
// @Produce json
// @Param slug path string true "内容标识"
// @Success 200 {object} model.Post
// @Failure 400,401,404,503 {object} map[string]string
// @Router /posts/{slug} [get]
func (h *ContentHandler) GetPost(c *gin.Context) { h.getPublished(c, "post") }

// GetNote 内容详情。
// @Summary 内容详情
// @Tags 公开内容
// @Produce json
// @Param slug path string true "内容标识"
// @Success 200 {object} model.Post
// @Failure 400,401,404,503 {object} map[string]string
// @Router /notes/{slug} [get]
func (h *ContentHandler) GetNote(c *gin.Context) { h.getPublished(c, "note") }

// GetThought 内容详情。
// @Summary 内容详情
// @Tags 公开内容
// @Produce json
// @Param slug path string true "内容标识"
// @Success 200 {object} model.Post
// @Failure 400,401,404,503 {object} map[string]string
// @Router /thinking/{slug} [get]
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

// GetAdminPost 内容详情。
// @Summary 内容详情（需后台登录）
// @Tags 文章管理
// @Produce json
// @Param id path int true "内容标识"
// @Success 200 {object} model.Post
// @Failure 400,401,404,503 {object} map[string]string
// @Router /admin/posts/{id} [get]
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

// CreatePost 文章写入。
// @Summary CreatePost（需后台登录，删除进入回收站）
// @Tags 文章管理
// @Produce json
// @Accept json
// @Param body body model.PostInput true "文章内容，更新时携带 version 防止覆盖"
// @Success 201 {object} model.Post
// @Failure 400,401,403,404,409,503 {object} map[string]string
// @Router /admin/posts [post]
func (h *ContentHandler) CreatePost(c *gin.Context) { h.savePost(c, 0) }

// UpdatePost 文章写入。
// @Summary UpdatePost（需后台登录，删除进入回收站）
// @Tags 文章管理
// @Produce json
// @Param id path int true "文章 ID"
// @Accept json
// @Param body body model.PostInput true "文章内容，更新时携带 version 防止覆盖"
// @Success 200 {object} model.Post
// @Failure 400,401,403,404,409,503 {object} map[string]string
// @Router /admin/posts/{id} [put]
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

// DeletePost 文章写入。
// @Summary DeletePost（需后台登录，删除进入回收站）
// @Tags 文章管理
// @Produce json
// @Param id path int true "文章 ID"
// @Success 204 "已移入回收站"
// @Failure 400,401,403,404,409,503 {object} map[string]string
// @Router /admin/posts/{id} [delete]
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
