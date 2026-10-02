package service

import (
	"context"
	"errors"
	"testing"

	"github.com/kakozane/kakozane-blog/api/internal/model"
)

func TestPageRequiresValidPublishedContent(t *testing.T) {
	service := NewPageService(nil)
	for _, input := range []model.Page{
		{Title: "Page", Slug: "page", Status: "published"},
		{Title: "Page", Slug: "bad/slugs", ContentMD: "body", Status: "published"},
		{Title: "Page", Slug: "page", ContentMD: "body", Status: "hidden"},
	} {
		if _, err := service.Save(context.Background(), 0, input); !errors.Is(err, ErrInvalidInput) {
			t.Fatalf("input %+v: got %v, want invalid input", input, err)
		}
	}
}
