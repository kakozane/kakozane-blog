package handler

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/kakozane/kakozane-blog/api/internal/config"
	"github.com/kakozane/kakozane-blog/api/internal/service"
)

func TestSSOOriginBoundary(t *testing.T) {
	gin.SetMode(gin.TestMode)
	h := NewAuthHandler(nil, []config.SSOSite{{FrontOrigin: "https://dev.kakozane.icu", AdminOrigin: "https://admin.dev.kakozane.icu"}})
	for _, test := range []struct {
		name, host, origin, scope, proto string
		allowed                          bool
	}{
		{"front to admin", "admin.dev.kakozane.icu", "https://dev.kakozane.icu", service.ScopeAdmin, "https", true},
		{"admin to front", "dev.kakozane.icu", "https://admin.dev.kakozane.icu", service.ScopeFront, "https", true},
		{"untrusted sibling", "dev.kakozane.icu", "https://evil.dev.kakozane.icu", service.ScopeFront, "https", false},
		{"production isolation", "dev.kakozane.icu", "https://admin.kakozane.icu", service.ScopeFront, "https", false},
		{"missing origin", "dev.kakozane.icu", "", service.ScopeFront, "https", false},
		{"wrong scope on host", "dev.kakozane.icu", "https://admin.dev.kakozane.icu", service.ScopeAdmin, "https", false},
		{"http", "dev.kakozane.icu", "https://admin.dev.kakozane.icu", service.ScopeFront, "http", false},
	} {
		t.Run(test.name, func(t *testing.T) {
			w := httptest.NewRecorder()
			c, _ := gin.CreateTestContext(w)
			c.Request = httptest.NewRequest(http.MethodOptions, "http://"+test.host+"/api/v1/auth/sso/ticket", nil)
			c.Request.Header.Set("Origin", test.origin)
			c.Request.Header.Set("X-Forwarded-Proto", test.proto)
			if got := h.allowSSOOrigin(c, test.scope); got != test.allowed {
				t.Fatalf("allowed=%v", got)
			}
			if test.allowed && (w.Header().Get("Access-Control-Allow-Origin") != test.origin || w.Header().Get("Access-Control-Allow-Credentials") != "true") {
				t.Fatal("missing credentialed CORS")
			}
			if !test.allowed && w.Header().Get("Access-Control-Allow-Origin") != "" {
				t.Fatal("rejected origin received CORS")
			}
			if w.Header().Get("Cache-Control") != "no-store" {
				t.Fatal("SSO response must not be cached")
			}
		})
	}
}

func TestSSOCookieRemainsHostOnly(t *testing.T) {
	h := NewAuthHandler(nil, nil)
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	h.setCookie(c, service.ScopeAdmin, "test-token", 0)
	cookie := w.Result().Cookies()[0]
	if cookie.Name != adminCookie || cookie.Domain != "" || cookie.Path != "/" || !cookie.HttpOnly || !cookie.Secure || cookie.SameSite != http.SameSiteStrictMode {
		t.Fatalf("unexpected cookie options: %+v", cookie)
	}
}
