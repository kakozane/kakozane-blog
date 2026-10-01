package service

import (
	"context"
	"errors"
	"strings"
	"unicode/utf8"

	"github.com/kakozane/kakozane-blog/api/internal/model"
	"github.com/kakozane/kakozane-blog/api/internal/repository"
)

var ErrCommentCooldown = errors.New("comment cooldown")

type CommentService struct {
	repo    *repository.CommentRepository
	content *repository.ContentRepository
	auth    *repository.AuthRepository
}

func NewCommentService(repo *repository.CommentRepository, content *repository.ContentRepository, auth *repository.AuthRepository) *CommentService {
	return &CommentService{repo: repo, content: content, auth: auth}
}

func (s *CommentService) PublicList(ctx context.Context, slug string, page int) ([]model.Comment, int64, error) {
	if page < 1 || page > 100000 {
		return nil, 0, ErrInvalidInput
	}
	post, err := s.content.PublishedPostBySlug(ctx, slug)
	if err != nil {
		return nil, 0, err
	}
	return s.repo.List(ctx, post.ID, "approved", page, 50)
}

func (s *CommentService) Create(ctx context.Context, slug string, userID int64, input model.CommentInput) (model.Comment, error) {
	input.Body = strings.TrimSpace(input.Body)
	if userID < 1 || utf8.RuneCountInString(input.Body) < 1 || utf8.RuneCountInString(input.Body) > 2000 {
		return model.Comment{}, ErrInvalidInput
	}
	post, err := s.content.PublishedPostBySlug(ctx, slug)
	if err != nil {
		return model.Comment{}, err
	}
	if input.ParentID != nil {
		if *input.ParentID < 1 {
			return model.Comment{}, ErrInvalidInput
		}
		approved, err := s.repo.ParentIsApproved(ctx, post.ID, *input.ParentID)
		if err != nil {
			return model.Comment{}, err
		}
		if !approved {
			return model.Comment{}, ErrInvalidInput
		}
	}
	user, err := s.auth.FindByID(ctx, userID)
	if err != nil {
		return model.Comment{}, err
	}
	allowed, err := s.repo.ReserveCommentSlot(ctx, userID)
	if err != nil {
		return model.Comment{}, err
	}
	if !allowed {
		return model.Comment{}, ErrCommentCooldown
	}
	return s.repo.Create(ctx, post.ID, userID, user.DisplayName, input)
}

func (s *CommentService) AdminList(ctx context.Context, status string, page int) ([]model.Comment, int64, error) {
	if page < 1 || page > 100000 || (status != "" && status != "pending" && status != "approved" && status != "rejected") {
		return nil, 0, ErrInvalidInput
	}
	return s.repo.List(ctx, 0, status, page, 20)
}

func (s *CommentService) SetStatus(ctx context.Context, id int64, status string) (model.Comment, error) {
	if id < 1 || (status != "pending" && status != "approved" && status != "rejected") {
		return model.Comment{}, ErrInvalidInput
	}
	return s.repo.SetStatus(ctx, id, status)
}

func (s *CommentService) Delete(ctx context.Context, id int64) error {
	if id < 1 {
		return ErrInvalidInput
	}
	return s.repo.Delete(ctx, id)
}
