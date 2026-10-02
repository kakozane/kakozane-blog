package service

import (
	"context"

	"github.com/kakozane/kakozane-blog/api/internal/model"
	"github.com/kakozane/kakozane-blog/api/internal/repository"
)

type EventService struct{ repo *repository.EventRepository }

func NewEventService(repo *repository.EventRepository) *EventService {
	return &EventService{repo: repo}
}

func (s *EventService) Publish(ctx context.Context, event model.PublishedEvent) error {
	return s.repo.Publish(ctx, event)
}

func (s *EventService) PublishSite(ctx context.Context) error {
	return s.repo.PublishSite(ctx)
}

func (s *EventService) Subscribe(ctx context.Context) (<-chan string, func(), error) {
	return s.repo.Subscribe(ctx)
}
