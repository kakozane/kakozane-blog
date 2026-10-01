package service

import (
	"context"
	"errors"
	"net/url"
	"regexp"
	"strings"
	"unicode/utf8"

	"github.com/go-sql-driver/mysql"
	"github.com/kakozane/kakozane-blog/api/internal/model"
	"github.com/kakozane/kakozane-blog/api/internal/repository"
)

var (
	ErrInvalidInput = errors.New("invalid input")
	ErrConflict     = errors.New("conflict")
	slugPattern     = regexp.MustCompile(`^[\pL\pN]+(?:-[\pL\pN]+)*$`)
)

type ContentService struct{ repo *repository.ContentRepository }

func NewContentService(repo *repository.ContentRepository) *ContentService {
	return &ContentService{repo: repo}
}

func (s *ContentService) ListTerms(ctx context.Context, kind string) ([]model.Term, error) {
	return s.repo.ListTerms(ctx, kind)
}

func (s *ContentService) SaveTerm(ctx context.Context, kind string, id int64, input model.Term) (int64, error) {
	input.Name = strings.TrimSpace(input.Name)
	input.Slug = strings.ToLower(strings.TrimSpace(input.Slug))
	if utf8.RuneCountInString(input.Name) < 1 || utf8.RuneCountInString(input.Name) > 100 || !validSlug(input.Slug) {
		return 0, ErrInvalidInput
	}
	result, err := s.repo.SaveTerm(ctx, kind, id, input)
	return result, contentWriteError(err)
}

func (s *ContentService) DeleteTerm(ctx context.Context, kind string, id int64) error {
	if id < 1 {
		return ErrInvalidInput
	}
	return s.repo.DeleteTerm(ctx, kind, id)
}

func (s *ContentService) ListPosts(ctx context.Context, filter model.PostFilter) ([]model.Post, int64, error) {
	if filter.Page < 1 {
		filter.Page = 1
	}
	if filter.PageSize < 1 || filter.PageSize > 50 {
		filter.PageSize = 10
	}
	filter.Query = strings.TrimSpace(filter.Query)
	if filter.Page > 100000 || len(filter.Query) > 100 || len(filter.CategorySlug) > 160 || len(filter.TagSlug) > 160 ||
		(filter.Status != "" && filter.Status != "draft" && filter.Status != "published") ||
		(filter.CategorySlug != "" && !validSlug(filter.CategorySlug)) || (filter.TagSlug != "" && !validSlug(filter.TagSlug)) {
		return nil, 0, ErrInvalidInput
	}
	return s.repo.ListPosts(ctx, filter)
}

func (s *ContentService) PostByID(ctx context.Context, id int64) (model.Post, error) {
	return s.repo.PostByID(ctx, id)
}

func (s *ContentService) PublishedPostBySlug(ctx context.Context, slug string) (model.Post, error) {
	return s.repo.PublishedPostBySlug(ctx, slug)
}

func (s *ContentService) SavePost(ctx context.Context, id, authorID int64, input model.PostInput) (model.Post, error) {
	input.Title = strings.TrimSpace(input.Title)
	input.Slug = strings.ToLower(strings.TrimSpace(input.Slug))
	input.Excerpt = strings.TrimSpace(input.Excerpt)
	input.CoverURL = strings.TrimSpace(input.CoverURL)
	if input.Status == "" {
		input.Status = "draft"
	}
	if utf8.RuneCountInString(input.Title) < 1 || utf8.RuneCountInString(input.Title) > 240 || !validSlug(input.Slug) ||
		utf8.RuneCountInString(input.Excerpt) > 500 || len(input.ContentMD) > 1024*1024 ||
		(input.Status != "draft" && input.Status != "published") || len(input.TagIDs) > 20 || !validCoverURL(input.CoverURL) {
		return model.Post{}, ErrInvalidInput
	}
	if input.CategoryID != nil && *input.CategoryID < 1 {
		return model.Post{}, ErrInvalidInput
	}
	seen := map[int64]bool{}
	for _, tagID := range input.TagIDs {
		if tagID < 1 || seen[tagID] {
			return model.Post{}, ErrInvalidInput
		}
		seen[tagID] = true
	}
	if input.Status == "published" && strings.TrimSpace(input.ContentMD) == "" {
		return model.Post{}, ErrInvalidInput
	}
	postID, err := s.repo.SavePost(ctx, id, authorID, input)
	if err != nil {
		return model.Post{}, contentWriteError(err)
	}
	return s.repo.PostByID(ctx, postID)
}

func (s *ContentService) DeletePost(ctx context.Context, id int64) error {
	if id < 1 {
		return ErrInvalidInput
	}
	return s.repo.DeletePost(ctx, id)
}

func validSlug(value string) bool {
	return value != "" && len(value) <= 160 && slugPattern.MatchString(value)
}

func validCoverURL(value string) bool {
	if value == "" {
		return true
	}
	if len(value) > 1024 || strings.HasPrefix(value, "//") {
		return false
	}
	if strings.HasPrefix(value, "/") {
		return true
	}
	parsed, err := url.Parse(value)
	return err == nil && parsed.Scheme == "https" && parsed.Host != ""
}

func contentWriteError(err error) error {
	var mysqlErr *mysql.MySQLError
	if errors.As(err, &mysqlErr) {
		switch mysqlErr.Number {
		case 1062:
			return ErrConflict
		case 1451:
			return ErrConflict
		case 1452:
			return ErrInvalidInput
		}
	}
	return err
}
