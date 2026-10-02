package handler

import (
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/kakozane/kakozane-blog/api/internal/service"
)

type EventHandler struct{ service *service.EventService }

func NewEventHandler(eventService *service.EventService) *EventHandler {
	return &EventHandler{service: eventService}
}

func (h *EventHandler) Stream(c *gin.Context) {
	messages, closeSubscription, err := h.service.Subscribe(c.Request.Context())
	if err != nil {
		slog.Error("subscribe to publications failed", "error", err)
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "实时通知暂不可用"})
		return
	}
	defer closeSubscription()
	c.Header("Content-Type", "text/event-stream")
	c.Header("Cache-Control", "no-cache, no-transform")
	c.Header("X-Accel-Buffering", "no")
	c.Writer.WriteHeaderNow()
	if _, err := io.WriteString(c.Writer, ": connected\n\n"); err != nil {
		return
	}
	c.Writer.Flush()
	keepalive := time.NewTicker(25 * time.Second)
	defer keepalive.Stop()
	// ponytail: one Redis subscription per visitor; use a shared broadcast hub if concurrent readership grows.
	c.Stream(func(w io.Writer) bool {
		select {
		case message, ok := <-messages:
			if !ok {
				return false
			}
			return writeEvent(w, message) == nil
		case <-keepalive.C:
			_, err := io.WriteString(w, ": keepalive\n\n")
			return err == nil
		case <-c.Request.Context().Done():
			return false
		}
	})
}

func writeEvent(w io.Writer, message string) error {
	event := "published"
	if message == "site" {
		event, message = "site", "{}"
	}
	_, err := fmt.Fprintf(w, "event: %s\ndata: %s\n\n", event, message)
	return err
}
