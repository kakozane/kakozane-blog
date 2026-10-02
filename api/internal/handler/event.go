package handler

import (
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"regexp"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/kakozane/kakozane-blog/api/internal/service"
)

type EventHandler struct{ service *service.EventService }

func NewEventHandler(eventService *service.EventService) *EventHandler {
	return &EventHandler{service: eventService}
}

var visitorIDPattern = regexp.MustCompile(`^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$`)

func (h *EventHandler) Stream(c *gin.Context) {
	visitor := c.Query("visitor")
	if visitor != "" && !visitorIDPattern.MatchString(visitor) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "无效的访客标识"})
		return
	}
	writePresence := func(w io.Writer) error {
		if visitor == "" {
			return nil
		}
		count, err := h.service.TouchVisitor(c.Request.Context(), visitor)
		if err != nil {
			return err
		}
		_, err = fmt.Fprintf(w, "event: presence\ndata: {\"count\":%d}\n\n", count)
		return err
	}

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
	if err := writePresence(c.Writer); err != nil {
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
			if err := writePresence(w); err != nil {
				return false
			}
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
