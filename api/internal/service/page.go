package service

import (
	"context"
	"strings"
	"unicode/utf8"

	"github.com/kakozane/kakozane-blog/api/internal/model"
	"github.com/kakozane/kakozane-blog/api/internal/repository"
)

type PageService struct{ repo *repository.PageRepository }

func NewPageService(repo *repository.PageRepository) *PageService { return &PageService{repo: repo} }

func (s *PageService) List(ctx context.Context, publicOnly bool) ([]model.Page, error) {
	return s.repo.List(ctx, publicOnly)
}

func (s *PageService) Search(ctx context.Context, keyword string) ([]model.Page, error) {
	keyword = strings.TrimSpace(keyword)
	if utf8.RuneCountInString(keyword) > 100 {
		return nil, ErrInvalidInput
	}
	if keyword == "" {
		return []model.Page{}, nil
	}
	return s.repo.Search(ctx, keyword)
}

func (s *PageService) PublishedBySlug(ctx context.Context, slug string) (model.Page, error) {
	return s.repo.PublishedBySlug(ctx, slug)
}

func (s *PageService) Get(ctx context.Context, id int64) (model.Page, error) {
	if id < 1 {
		return model.Page{}, ErrInvalidInput
	}
	return s.repo.Get(ctx, id)
}

func (s *PageService) Save(ctx context.Context, id int64, input model.Page) (model.Page, error) {
	input.Title = strings.TrimSpace(input.Title)
	input.Slug = strings.ToLower(strings.TrimSpace(input.Slug))
	input.Description = strings.TrimSpace(input.Description)
	if input.Status == "" {
		input.Status = "draft"
	}
	if id < 0 || utf8.RuneCountInString(input.Title) < 1 || utf8.RuneCountInString(input.Title) > 240 ||
		!validSlug(input.Slug) || utf8.RuneCountInString(input.Description) > 500 || len(input.ContentMD) > 1024*1024 ||
		(input.Status != "draft" && input.Status != "published") ||
		(input.Status == "published" && strings.TrimSpace(input.ContentMD) == "") {
		return model.Page{}, ErrInvalidInput
	}
	item, err := s.repo.Save(ctx, id, input)
	return item, contentWriteError(err)
}

func (s *PageService) Delete(ctx context.Context, id int64) error {
	if id < 1 {
		return ErrInvalidInput
	}
	return s.repo.Delete(ctx, id)
}
