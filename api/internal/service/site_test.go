package service

import (
	"context"
	"errors"
	"testing"
	"time"

	"github.com/kakozane/kakozane-blog/api/internal/model"
)

func TestOwnerStatusExpiryAndValidation(t *testing.T) {
	now := time.Date(2026, 10, 2, 0, 0, 0, 0, time.UTC)
	expired := now.Add(-time.Second)
	active := now.Add(time.Hour)
	for _, test := range []struct {
		until *time.Time
		want  string
	}{
		{nil, "写代码"},
		{&active, "写代码"},
		{&expired, ""},
	} {
		got := publicSite(model.Site{StatusEmoji: "💻", StatusText: "写代码", StatusUntil: test.until}, now)
		if got.StatusText != test.want {
			t.Fatalf("until %v: got %q, want %q", test.until, got.StatusText, test.want)
		}
	}

	site := model.Site{Title: "Blog", Tagline: "Thoughts", SiteURL: "https://example.com", StatusText: "写代码"}
	if _, err := NewSiteService(nil, nil).Update(context.Background(), site); !errors.Is(err, ErrInvalidInput) {
		t.Fatalf("status without emoji: got %v, want invalid input", err)
	}
}

func TestSiteNavigationValidation(t *testing.T) {
	for _, href := range []string{"/pages/hello", "/projects#work", "https://example.com/path?q=blog"} {
		if !validNavHref(href) {
			t.Errorf("valid link %q rejected", href)
		}
	}
	for _, href := range []string{"", "//evil.example", "javascript:alert(1)", "http://example.com", "https://user:pass@example.com", "/\\evil", "/hello\nworld"} {
		if validNavHref(href) {
			t.Errorf("unsafe link %q accepted", href)
		}
	}
	base := model.Site{Title: "Blog", Tagline: "Thoughts", SiteURL: "https://example.com"}
	for _, links := range [][]model.NavLink{
		{{Label: "", Href: "/pages/hello"}},
		{{Label: "页面", Href: "javascript:alert(1)"}},
		{{Label: "甲", Href: "/pages/hello"}, {Label: "乙", Href: "/pages/hello"}},
		{{Label: "1"}, {Label: "2"}, {Label: "3"}, {Label: "4"}, {Label: "5"}, {Label: "6"}},
	} {
		site := base
		site.NavLinks = links
		if _, err := NewSiteService(nil, nil).Update(context.Background(), site); !errors.Is(err, ErrInvalidInput) {
			t.Errorf("invalid links %#v: got %v", links, err)
		}
	}
}

func TestSiteFaviconRejectsUnsafeURL(t *testing.T) {
	site := model.Site{Title: "Blog", Tagline: "Thoughts", SiteURL: "https://example.com", FaviconURL: "javascript:alert(1)"}
	if _, err := NewSiteService(nil, nil).Update(context.Background(), site); !errors.Is(err, ErrInvalidInput) {
		t.Fatalf("unsafe favicon: got %v, want invalid input", err)
	}
}
