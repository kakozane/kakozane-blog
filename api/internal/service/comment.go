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
var ErrCommentNotEditable = errors.New("comment not editable")
var ErrCommentNotPinnable = errors.New("comment not pinnable")

type CommentService struct {
	repo    *repository.CommentRepository
	content *repository.ContentRepository
	auth    *repository.AuthRepository
}

func NewCommentService(repo *repository.CommentRepository, content *repository.ContentRepository, auth *repository.AuthRepository) *CommentService {
	return &CommentService{repo: repo, content: content, auth: auth}
}

func (s *CommentService) PublicList(ctx context.Context, slug, kind string, page int) ([]model.Comment, int64, error) {
	if page < 1 || page > 100000 {
		return nil, 0, ErrInvalidInput
	}
	post, err := s.published(ctx, slug, kind)
	if err != nil {
		return nil, 0, err
	}
	return s.repo.List(ctx, post.ID, 0, []string{"approved"}, page, 50)
}

func (s *CommentService) RecentPublic(ctx context.Context) ([]model.RecentComment, error) {
	return s.repo.RecentPublic(ctx, 6)
}

func (s *CommentService) Mine(ctx context.Context, slug, kind string, userID int64) ([]model.Comment, int64, error) {
	if userID < 1 {
		return nil, 0, ErrInvalidInput
	}
	post, err := s.published(ctx, slug, kind)
	if err != nil {
		return nil, 0, err
	}
	return s.repo.List(ctx, post.ID, userID, []string{"pending", "rejected"}, 1, 50)
}

func (s *CommentService) Create(ctx context.Context, slug, kind string, userID int64, input model.CommentInput) (model.Comment, error) {
	input.Body = strings.TrimSpace(input.Body)
	if userID < 1 || !validCommentBody(input.Body) {
		return model.Comment{}, ErrInvalidInput
	}
	post, err := s.published(ctx, slug, kind)
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

func (s *CommentService) Edit(ctx context.Context, slug, kind string, userID, commentID int64, body string) (model.Comment, error) {
	body = strings.TrimSpace(body)
	if userID < 1 || commentID < 1 || !validCommentBody(body) {
		return model.Comment{}, ErrInvalidInput
	}
	post, err := s.published(ctx, slug, kind)
	if err != nil {
		return model.Comment{}, err
	}
	item, err := s.repo.EditOwn(ctx, post.ID, userID, commentID, body)
	if errors.Is(err, repository.ErrNotFound) {
		return model.Comment{}, ErrCommentNotEditable
	}
	return item, err
}

func validCommentBody(body string) bool {
	count := utf8.RuneCountInString(body)
	return count >= 1 && count <= 2000
}

func (s *CommentService) published(ctx context.Context, slug, kind string) (model.Post, error) {
	post, err := s.content.PublishedPostBySlug(ctx, slug)
	if err != nil {
		return model.Post{}, err
	}
	if post.Kind != kind {
		return model.Post{}, repository.ErrNotFound
	}
	return post, nil
}

func (s *CommentService) AdminList(ctx context.Context, status string, page int) ([]model.Comment, int64, error) {
	if page < 1 || page > 100000 || (status != "" && status != "pending" && status != "approved" && status != "rejected") {
		return nil, 0, ErrInvalidInput
	}
	var statuses []string
	if status != "" {
		statuses = []string{status}
	}
	return s.repo.List(ctx, 0, 0, statuses, page, 20)
}

func (s *CommentService) SetStatus(ctx context.Context, id int64, status string) (model.Comment, error) {
	if id < 1 || (status != "pending" && status != "approved" && status != "rejected") {
		return model.Comment{}, ErrInvalidInput
	}
	return s.repo.SetStatus(ctx, id, status)
}

func (s *CommentService) SetPinned(ctx context.Context, id int64, pinned bool) (model.Comment, error) {
	if id < 1 {
		return model.Comment{}, ErrInvalidInput
	}
	item, err := s.repo.ByID(ctx, id)
	if err != nil {
		return model.Comment{}, err
	}
	if pinned && (item.Status != "approved" || item.ParentID != nil) {
		return model.Comment{}, ErrCommentNotPinnable
	}
	return s.repo.SetPinned(ctx, id, pinned)
}

func (s *CommentService) PublicPageOf(ctx context.Context, slug, kind string, id int64) (int, error) {
	if id < 1 {
		return 0, ErrInvalidInput
	}
	post, err := s.published(ctx, slug, kind)
	if err != nil {
		return 0, err
	}
	return s.repo.PublicPageOf(ctx, post.ID, id)
}

func (s *CommentService) Delete(ctx context.Context, id int64) error {
	if id < 1 {
		return ErrInvalidInput
	}
	return s.repo.Delete(ctx, id)
}
