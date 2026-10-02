package service

import (
	"context"
	"log/slog"
	"net/url"
	"strings"
	"time"
	"unicode/utf8"

	"github.com/kakozane/kakozane-blog/api/internal/model"
	"github.com/kakozane/kakozane-blog/api/internal/repository"
)

type SiteService struct {
	repo   *repository.SiteRepository
	events *EventService
}

func NewSiteService(repo *repository.SiteRepository, events *EventService) *SiteService {
	return &SiteService{repo: repo, events: events}
}

func (s *SiteService) Get(ctx context.Context) (model.Site, error) {
	item, err := s.repo.Get(ctx)
	if err != nil {
		return item, err
	}
	return publicSite(item, time.Now()), nil
}

func publicSite(item model.Site, now time.Time) model.Site {
	if item.StatusUntil != nil && !item.StatusUntil.After(now) {
		item.StatusEmoji, item.StatusText, item.StatusUntil = "", "", nil
	}
	return item
}

func (s *SiteService) Update(ctx context.Context, input model.Site) (model.Site, error) {
	input.Title = strings.TrimSpace(input.Title)
	input.Tagline = strings.TrimSpace(input.Tagline)
	input.Description = strings.TrimSpace(input.Description)
	input.SiteURL = strings.TrimRight(strings.TrimSpace(input.SiteURL), "/")
	input.GitHubURL = strings.TrimSpace(input.GitHubURL)
	input.AvatarURL = strings.TrimSpace(input.AvatarURL)
	input.FaviconURL = strings.TrimSpace(input.FaviconURL)
	input.StatusEmoji = strings.TrimSpace(input.StatusEmoji)
	input.StatusText = strings.TrimSpace(input.StatusText)
	if len(input.NavLinks) > 5 {
		return model.Site{}, ErrInvalidInput
	}
	seenNav := make(map[string]struct{}, len(input.NavLinks))
	for i := range input.NavLinks {
		input.NavLinks[i].Label = strings.TrimSpace(input.NavLinks[i].Label)
		input.NavLinks[i].Href = strings.TrimSpace(input.NavLinks[i].Href)
		if utf8.RuneCountInString(input.NavLinks[i].Label) < 1 || utf8.RuneCountInString(input.NavLinks[i].Label) > 20 || !validNavHref(input.NavLinks[i].Href) {
			return model.Site{}, ErrInvalidInput
		}
		if _, exists := seenNav[input.NavLinks[i].Href]; exists {
			return model.Site{}, ErrInvalidInput
		}
		seenNav[input.NavLinks[i].Href] = struct{}{}
	}
	if input.NavLinks == nil {
		input.NavLinks = []model.NavLink{}
	}
	if utf8.RuneCountInString(input.Title) < 1 || utf8.RuneCountInString(input.Title) > 100 ||
		utf8.RuneCountInString(input.Tagline) < 1 || utf8.RuneCountInString(input.Tagline) > 240 ||
		utf8.RuneCountInString(input.Description) > 500 || len(input.AboutMD) > 65535 || len(input.SiteURL) > 255 ||
		!secureURL(input.SiteURL) || (input.GitHubURL != "" && !secureURL(input.GitHubURL)) || !validCoverURL(input.AvatarURL) || !validCoverURL(input.FaviconURL) ||
		utf8.RuneCountInString(input.StatusEmoji) > 16 || utf8.RuneCountInString(input.StatusText) > 160 ||
		(input.StatusEmoji == "") != (input.StatusText == "") ||
		(input.StatusText == "" && input.StatusUntil != nil) ||
		(input.StatusUntil != nil && !input.StatusUntil.After(time.Now())) {
		return model.Site{}, ErrInvalidInput
	}
	siteURL, _ := url.Parse(input.SiteURL)
	if siteURL.Path != "" || siteURL.RawPath != "" {
		return model.Site{}, ErrInvalidInput
	}
	item, err := s.repo.Update(ctx, input)
	if err != nil {
		return model.Site{}, err
	}
	if s.events != nil {
		if err := s.events.PublishSite(ctx); err != nil {
			slog.Warn("site notification failed", "error", err)
		}
	}
	return publicSite(item, time.Now()), nil
}

func secureURL(value string) bool {
	if len(value) > 1024 {
		return false
	}
	parsed, err := url.Parse(value)
	return err == nil && parsed.Scheme == "https" && parsed.Host != "" && parsed.User == nil && parsed.RawQuery == "" && parsed.Fragment == ""
}

func validNavHref(value string) bool {
	if value == "" || len(value) > 512 || strings.ContainsAny(value, " \\\r\n\t") {
		return false
	}
	parsed, err := url.Parse(value)
	if err != nil || parsed.User != nil {
		return false
	}
	if strings.HasPrefix(value, "/") {
		return !strings.HasPrefix(value, "//") && parsed.Scheme == "" && parsed.Host == "" && parsed.Path != ""
	}
	return parsed.Scheme == "https" && parsed.Host != ""
}
