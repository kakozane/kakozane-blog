package handler

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/kakozane/kakozane-blog/api/internal/model"
	"github.com/kakozane/kakozane-blog/api/internal/service"
)

type ProjectHandler struct{ service *service.ProjectService }

func NewProjectHandler(projectService *service.ProjectService) *ProjectHandler {
	return &ProjectHandler{service: projectService}
}

func (h *ProjectHandler) PublicList(c *gin.Context) { h.list(c, true) }
func (h *ProjectHandler) AdminList(c *gin.Context)  { h.list(c, false) }

func (h *ProjectHandler) list(c *gin.Context, publicOnly bool) {
	items, err := h.service.List(c.Request.Context(), publicOnly)
	if err != nil {
		linkError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"items": items})
}

func (h *ProjectHandler) Create(c *gin.Context) { h.save(c, 0) }

func (h *ProjectHandler) Update(c *gin.Context) {
	id, ok := contentID(c)
	if ok {
		h.save(c, id)
	}
}

func (h *ProjectHandler) save(c *gin.Context, id int64) {
	c.Request.Body = http.MaxBytesReader(c.Writer, c.Request.Body, 4096)
	var input model.Project
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

func (h *ProjectHandler) Delete(c *gin.Context) {
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
