package handler

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
)

func TestSecureSameOrigin(t *testing.T) {
	gin.SetMode(gin.TestMode)
	for _, test := range []struct {
		name, protocol, origin string
		wantCode               int
		wantAllowed            bool
	}{
		{"same origin", "https", "https://localhost:6326", http.StatusOK, true},
		{"cross origin", "https", "https://other.example", http.StatusForbidden, false},
		{"plain http", "http", "http://localhost:6326", http.StatusUpgradeRequired, false},
	} {
		t.Run(test.name, func(t *testing.T) {
			writer := httptest.NewRecorder()
			context, _ := gin.CreateTestContext(writer)
			context.Request = httptest.NewRequest(http.MethodPost, "http://localhost:6326/api/v1/admin/posts", nil)
			context.Request.Header.Set("X-Forwarded-Proto", test.protocol)
			context.Request.Header.Set("Origin", test.origin)
			if allowed := secureSameOrigin(context); allowed != test.wantAllowed || writer.Code != test.wantCode {
				t.Fatalf("allowed=%v status=%d, want allowed=%v status=%d", allowed, writer.Code, test.wantAllowed, test.wantCode)
			}
		})
	}
}
