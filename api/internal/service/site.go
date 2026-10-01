package service

import (
	"context"
	"net/url"
	"strings"
	"unicode/utf8"

	"github.com/kakozane/kakozane-blog/api/internal/model"
	"github.com/kakozane/kakozane-blog/api/internal/repository"
)

type SiteService struct{ repo *repository.SiteRepository }

func NewSiteService(repo *repository.SiteRepository) *SiteService { return &SiteService{repo: repo} }

func (s *SiteService) Get(ctx context.Context) (model.Site, error) { return s.repo.Get(ctx) }

func (s *SiteService) Update(ctx context.Context, input model.Site) (model.Site, error) {
	input.Title = strings.TrimSpace(input.Title)
	input.Tagline = strings.TrimSpace(input.Tagline)
	input.Description = strings.TrimSpace(input.Description)
	input.SiteURL = strings.TrimRight(strings.TrimSpace(input.SiteURL), "/")
	input.GitHubURL = strings.TrimSpace(input.GitHubURL)
	if utf8.RuneCountInString(input.Title) < 1 || utf8.RuneCountInString(input.Title) > 100 ||
		utf8.RuneCountInString(input.Tagline) < 1 || utf8.RuneCountInString(input.Tagline) > 240 ||
		utf8.RuneCountInString(input.Description) > 500 || len(input.AboutMD) > 65535 || len(input.SiteURL) > 255 ||
		!secureURL(input.SiteURL) || (input.GitHubURL != "" && !secureURL(input.GitHubURL)) {
		return model.Site{}, ErrInvalidInput
	}
	siteURL, _ := url.Parse(input.SiteURL)
	if siteURL.Path != "" || siteURL.RawPath != "" {
		return model.Site{}, ErrInvalidInput
	}
	return s.repo.Update(ctx, input)
}

func secureURL(value string) bool {
	if len(value) > 1024 {
		return false
	}
	parsed, err := url.Parse(value)
	return err == nil && parsed.Scheme == "https" && parsed.Host != "" && parsed.User == nil && parsed.RawQuery == "" && parsed.Fragment == ""
}
