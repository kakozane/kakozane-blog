package service

import (
	"context"

	"github.com/kakozane/kakozane-blog/api/internal/model"
	"github.com/kakozane/kakozane-blog/api/internal/repository"
)

type LikeService struct {
	repo    *repository.LikeRepository
	content *repository.ContentRepository
}

func NewLikeService(repo *repository.LikeRepository, content *repository.ContentRepository) *LikeService {
	return &LikeService{repo: repo, content: content}
}

func (s *LikeService) RecentPublic(ctx context.Context) ([]model.RecentLike, error) {
	return s.repo.RecentPublic(ctx, 6)
}

func (s *LikeService) Mine(ctx context.Context, userID int64, page int) ([]model.LikedPost, int64, error) {
	if userID < 1 || page < 1 || page > 100000 {
		return nil, 0, ErrInvalidInput
	}
	return s.repo.Mine(ctx, userID, page, 20)
}

func (s *LikeService) State(ctx context.Context, slug, kind string, userID int64) (model.LikeState, error) {
	post, err := s.published(ctx, slug, kind)
	if err != nil {
		return model.LikeState{}, err
	}
	return s.repo.State(ctx, post.ID, userID)
}

func (s *LikeService) Set(ctx context.Context, slug, kind string, userID int64, liked bool) (model.LikeState, error) {
	if userID < 1 {
		return model.LikeState{}, ErrInvalidInput
	}
	post, err := s.published(ctx, slug, kind)
	if err != nil {
		return model.LikeState{}, err
	}
	if err := s.repo.Set(ctx, post.ID, userID, liked); err != nil {
		return model.LikeState{}, err
	}
	return s.repo.State(ctx, post.ID, userID)
}

func (s *LikeService) published(ctx context.Context, slug, kind string) (model.Post, error) {
	post, err := s.content.PublishedPostBySlug(ctx, slug)
	if err != nil {
		return model.Post{}, err
	}
	if post.Kind != kind {
		return model.Post{}, repository.ErrNotFound
	}
	return post, nil
}
