package handler

import (
	"errors"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/kakozane/kakozane-blog/api/internal/model"
	"github.com/kakozane/kakozane-blog/api/internal/repository"
	"github.com/kakozane/kakozane-blog/api/internal/service"
)

type SayHandler struct{ service *service.SayService }

func NewSayHandler(sayService *service.SayService) *SayHandler {
	return &SayHandler{service: sayService}
}

func (h *SayHandler) PublicList(c *gin.Context) { h.list(c, true) }
func (h *SayHandler) AdminList(c *gin.Context)  { h.list(c, false) }

func (h *SayHandler) list(c *gin.Context, publicOnly bool) {
	page, pageErr := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, sizeErr := strconv.Atoi(c.DefaultQuery("pageSize", "20"))
	if pageErr != nil || sizeErr != nil {
		sayError(c, service.ErrInvalidInput)
		return
	}
	items, total, err := h.service.List(c.Request.Context(), publicOnly, page, pageSize)
	if err != nil {
		sayError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"items": items, "total": total, "page": page, "pageSize": pageSize})
}

func (h *SayHandler) Create(c *gin.Context) { h.save(c, 0) }

func (h *SayHandler) Update(c *gin.Context) {
	id, ok := contentID(c)
	if ok {
		h.save(c, id)
	}
}

func (h *SayHandler) save(c *gin.Context, id int64) {
	c.Request.Body = http.MaxBytesReader(c.Writer, c.Request.Body, 16<<10)
	var input model.Say
	if err := c.ShouldBindJSON(&input); err != nil {
		sayError(c, service.ErrInvalidInput)
		return
	}
	item, err := h.service.Save(c.Request.Context(), id, input)
	if err != nil {
		sayError(c, err)
		return
	}
	status := http.StatusOK
	if id == 0 {
		status = http.StatusCreated
	}
	c.JSON(status, item)
}

func (h *SayHandler) Delete(c *gin.Context) {
	id, ok := contentID(c)
	if !ok {
		return
	}
	if err := h.service.Delete(c.Request.Context(), id); err != nil {
		sayError(c, err)
		return
	}
	c.Status(http.StatusNoContent)
}

func sayError(c *gin.Context, err error) {
	switch {
	case errors.Is(err, service.ErrInvalidInput):
		c.JSON(http.StatusBadRequest, gin.H{"error": "请检查一言内容、作者、出处或分页参数"})
	case errors.Is(err, repository.ErrNotFound):
		c.JSON(http.StatusNotFound, gin.H{"error": "一言不存在"})
	default:
		contentError(c, err)
	}
}
