package service

import (
	"context"

	"github.com/kakozane/kakozane-blog/api/internal/model"
	"github.com/kakozane/kakozane-blog/api/internal/repository"
)

type FeedService struct {
	content *repository.ContentRepository
	site    *repository.SiteRepository
}

func NewFeedService(content *repository.ContentRepository, site *repository.SiteRepository) *FeedService {
	return &FeedService{content: content, site: site}
}

func (s *FeedService) Data(ctx context.Context, limit int) (model.Site, []model.FeedPost, error) {
	site, err := s.site.Get(ctx)
	if err != nil {
		return model.Site{}, nil, err
	}
	posts, err := s.content.PublishedForFeed(ctx, limit)
	return site, posts, err
}

func (s *FeedService) Site(ctx context.Context) (model.Site, error) { return s.site.Get(ctx) }
