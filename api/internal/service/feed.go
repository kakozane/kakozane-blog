package service

import (
	"context"

	"github.com/kakozane/kakozane-blog/api/internal/model"
	"github.com/kakozane/kakozane-blog/api/internal/repository"
)

type FeedService struct {
	content *repository.ContentRepository
	site    *repository.SiteRepository
	pages   *repository.PageRepository
}

func NewFeedService(content *repository.ContentRepository, site *repository.SiteRepository, pages *repository.PageRepository) *FeedService {
	return &FeedService{content: content, site: site, pages: pages}
}

func (s *FeedService) Data(ctx context.Context, limit int, kind string) (model.Site, []model.FeedPost, error) {
	site, err := s.site.Get(ctx)
	if err != nil {
		return model.Site{}, nil, err
	}
	posts, err := s.content.PublishedForFeed(ctx, limit, kind)
	return site, posts, err
}

func (s *FeedService) Site(ctx context.Context) (model.Site, error) { return s.site.Get(ctx) }

func (s *FeedService) NoteSeries(ctx context.Context) ([]model.NoteSeries, error) {
	return s.content.ListNoteSeries(ctx)
}

func (s *FeedService) PublicTerms(ctx context.Context, kind string) ([]model.Term, error) {
	return s.content.ListTerms(ctx, kind, true)
}

func (s *FeedService) Pages(ctx context.Context) ([]model.Page, error) {
	return s.pages.List(ctx, true)
}
