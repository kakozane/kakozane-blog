package handler

import (
	"bytes"
	"net/http"
	"net/http/httptest"

	"github.com/gin-gonic/gin"
	"testing"
)

func TestWriteEvent(t *testing.T) {
	for _, test := range []struct {
		message string
		want    string
	}{
		{"site", "event: site\ndata: {}\n\n"},
		{`{"kind":"post","title":"Test","slug":"test"}`, "event: published\ndata: {\"kind\":\"post\",\"title\":\"Test\",\"slug\":\"test\"}\n\n"},
	} {
		var body bytes.Buffer
		if err := writeEvent(&body, test.message); err != nil {
			t.Fatal(err)
		}
		if body.String() != test.want {
			t.Fatalf("event frame = %q, want %q", body.String(), test.want)
		}
	}
}

func TestEventStreamRejectsInvalidVisitor(t *testing.T) {
	gin.SetMode(gin.TestMode)
	r := gin.New()
	r.GET("/events", NewEventHandler(nil).Stream)
	for _, visitor := range []string{"bad", "00000000-0000-0000-0000-000000000000", "%0Aevent:fake"} {
		w := httptest.NewRecorder()
		r.ServeHTTP(w, httptest.NewRequest(http.MethodGet, "/events?visitor="+visitor, nil))
		if w.Code != http.StatusBadRequest {
			t.Fatalf("invalid visitor accepted: %d", w.Code)
		}
	}
}
