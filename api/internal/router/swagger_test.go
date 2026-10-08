package router

import (
	"encoding/json"
	"github.com/gin-gonic/gin"
	"net/http/httptest"
	"testing"
)

func TestSwaggerAvailabilityAndContract(t *testing.T) {
	for _, enabled := range []bool{false, true} {
		r := gin.New()
		registerSwagger(r, enabled)
		for _, path := range []string{"/api/v1/swagger/index.html", "/api/v1/swagger/doc.json"} {
			w := httptest.NewRecorder()
			r.ServeHTTP(w, httptest.NewRequest("GET", path, nil))
			want := 404
			if enabled {
				want = 200
			}
			if w.Code != want {
				t.Fatalf("enabled=%v path=%s status=%d", enabled, path, w.Code)
			}
			if enabled && path == "/api/v1/swagger/doc.json" {
				var doc struct {
					BasePath string                                `json:"basePath"`
					Host     string                                `json:"host"`
					Paths    map[string]map[string]json.RawMessage `json:"paths"`
				}
				if err := json.Unmarshal(w.Body.Bytes(), &doc); err != nil {
					t.Fatal(err)
				}
				if doc.BasePath != "/api/v1" || doc.Host != "" {
					t.Fatal("Swagger must use versioned same-origin API")
				}
				for path, method := range map[string]string{"/health": "get", "/auth/login": "post", "/admin/auth/login": "post", "/admin/posts/{id}": "put", "/admin/drafts/{key}": "put"} {
					if len(doc.Paths[path][method]) == 0 {
						t.Fatalf("missing %s %s", method, path)
					}
				}
			}
		}
	}
}
