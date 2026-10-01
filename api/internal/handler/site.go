package handler

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/kakozane/kakozane-blog/api/internal/model"
	"github.com/kakozane/kakozane-blog/api/internal/service"
)

type SiteHandler struct{ service *service.SiteService }

func NewSiteHandler(siteService *service.SiteService) *SiteHandler {
	return &SiteHandler{service: siteService}
}

func (h *SiteHandler) Get(c *gin.Context) {
	item, err := h.service.Get(c.Request.Context())
	if err != nil {
		contentError(c, err)
		return
	}
	c.JSON(http.StatusOK, item)
}

func (h *SiteHandler) Update(c *gin.Context) {
	c.Request.Body = http.MaxBytesReader(c.Writer, c.Request.Body, 70<<10)
	var input model.Site
	if err := c.ShouldBindJSON(&input); err != nil {
		contentError(c, service.ErrInvalidInput)
		return
	}
	item, err := h.service.Update(c.Request.Context(), input)
	if err != nil {
		contentError(c, err)
		return
	}
	c.JSON(http.StatusOK, item)
}
