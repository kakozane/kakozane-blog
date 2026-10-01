package router

import (
	"github.com/gin-gonic/gin"
	"github.com/kakozane/kakozane-blog/api/internal/handler"
)

func New(healthHandler *handler.HealthHandler, authHandler *handler.AuthHandler) *gin.Engine {
	r := gin.Default()
	api := r.Group("/api/v1")
	api.GET("/health", healthHandler.Get)
	auth := api.Group("/auth")
	auth.POST("/login", authHandler.FrontLogin)
	auth.GET("/me", authHandler.FrontMe)
	auth.POST("/logout", authHandler.FrontLogout)
	adminAuth := api.Group("/admin/auth")
	adminAuth.POST("/login", authHandler.AdminLogin)
	adminAuth.GET("/me", authHandler.AdminMe)
	adminAuth.POST("/logout", authHandler.AdminLogout)
	return r
}
