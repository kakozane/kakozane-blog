package service

import (
	"context"
	"errors"
	"strings"
	"testing"
	"time"

	"github.com/kakozane/kakozane-blog/api/internal/model"
)

func TestRejectInvalidContentKind(t *testing.T) {
	service := NewContentService(nil, nil)
	_, _, err := service.ListPosts(context.Background(), model.PostFilter{Kind: "page"})
	if !errors.Is(err, ErrInvalidInput) {
		t.Fatalf("invalid filter kind: got %v", err)
	}

	_, err = service.SavePost(context.Background(), 0, 1, model.PostInput{
		Kind: "page", Title: "Test", Slug: "test", Status: "draft",
	})
	if !errors.Is(err, ErrInvalidInput) {
		t.Fatalf("invalid input kind: got %v", err)
	}
}

func TestRejectLongThought(t *testing.T) {
	service := NewContentService(nil, nil)
	_, err := service.SavePost(context.Background(), 0, 1, model.PostInput{
		Kind: "thought", Title: "Thought", Slug: "thought", Status: "published", ContentMD: strings.Repeat("a", 2001),
	})
	if !errors.Is(err, ErrInvalidInput) {
		t.Fatalf("long thought: got %v", err)
	}
}

func TestRejectPinnedThought(t *testing.T) {
	service := NewContentService(nil, nil)
	_, err := service.SavePost(context.Background(), 0, 1, model.PostInput{
		Kind: "thought", Title: "Thought", Slug: "thought", Status: "draft", Pinned: true,
	})
	if !errors.Is(err, ErrInvalidInput) {
		t.Fatalf("pinned thought: got %v", err)
	}
}

func TestFeaturedFilterIsForNotes(t *testing.T) {
	service := NewContentService(nil, nil)
	_, _, err := service.ListPosts(context.Background(), model.PostFilter{Kind: "post", FeaturedOnly: true})
	if !errors.Is(err, ErrInvalidInput) {
		t.Fatalf("featured articles: got %v", err)
	}
}

func TestReserveNoteSeriesRoute(t *testing.T) {
	service := NewContentService(nil, nil)
	_, err := service.SavePost(context.Background(), 0, 1, model.PostInput{
		Kind: "note", Title: "Series", Slug: "series", Status: "draft",
	})
	if !errors.Is(err, ErrInvalidInput) {
		t.Fatalf("reserved note slug: got %v", err)
	}
}

func TestMonthCountsCrossesYear(t *testing.T) {
	got := monthCounts(time.Date(2026, 2, 1, 0, 0, 0, 0, time.UTC), map[string]int64{"2025-12": 2, "2026-02": 1})
	if len(got) != 12 || got[0].Month != "2025-03" || got[9].Count != 2 || got[11].Month != "2026-02" || got[11].Count != 1 {
		t.Fatalf("monthCounts() = %+v", got)
	}
}

func TestRejectInvalidTimelineMonth(t *testing.T) {
	svc := NewContentService(nil, nil)
	for _, month := range []string{"2026-13", "2026-1", "1999-12", "2026-10 OR 1=1"} {
		_, _, err := svc.ListPosts(context.Background(), model.PostFilter{Kind: "all", Month: month})
		if !errors.Is(err, ErrInvalidInput) {
			t.Fatalf("month %q: got %v, want invalid input", month, err)
		}
	}
}

func TestRejectInvalidPostSort(t *testing.T) {
	svc := NewContentService(nil, nil)
	for _, sort := range []string{"title", "published_at DESC", "oldest; DROP TABLE posts"} {
		_, _, err := svc.ListPosts(context.Background(), model.PostFilter{PublishedOnly: true, Kind: "post", Sort: sort})
		if !errors.Is(err, ErrInvalidInput) {
			t.Fatalf("sort %q: got %v, want invalid input", sort, err)
		}
	}
	_, _, err := svc.ListPosts(context.Background(), model.PostFilter{Kind: "post", Sort: "oldest"})
	if !errors.Is(err, ErrInvalidInput) {
		t.Fatalf("admin sort: got %v, want invalid input", err)
	}
}
