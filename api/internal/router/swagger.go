package router

import (
	"github.com/gin-gonic/gin"
	_ "github.com/kakozane/kakozane-blog/api/docs"
	swaggerFiles "github.com/swaggo/files"
	ginSwagger "github.com/swaggo/gin-swagger"
)

func registerSwagger(r *gin.Engine, enabled bool) {
	if enabled {
		r.GET("/api/v1/swagger/*any", ginSwagger.WrapHandler(swaggerFiles.Handler,
			ginSwagger.URL("doc.json"), ginSwagger.PersistAuthorization(false)))
	}
}
