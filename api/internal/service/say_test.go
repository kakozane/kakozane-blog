package service

import (
	"context"
	"errors"
	"strings"
	"testing"

	"github.com/kakozane/kakozane-blog/api/internal/model"
)

func TestSayRejectsInvalidText(t *testing.T) {
	svc := NewSayService(nil)
	for _, value := range []string{"   ", strings.Repeat("文", 1001)} {
		_, err := svc.Save(context.Background(), 0, model.Say{Text: value})
		if !errors.Is(err, ErrInvalidInput) {
			t.Fatalf("Save(%q) error = %v, want invalid input", value[:min(len(value), 12)], err)
		}
	}
}
