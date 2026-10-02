package service

import (
	"context"
	"strings"
	"unicode/utf8"

	"github.com/kakozane/kakozane-blog/api/internal/model"
	"github.com/kakozane/kakozane-blog/api/internal/repository"
)

type SayService struct{ repo *repository.SayRepository }

func NewSayService(repo *repository.SayRepository) *SayService { return &SayService{repo: repo} }

func (s *SayService) List(ctx context.Context, publicOnly bool, page, pageSize int) ([]model.Say, int64, error) {
	if page < 1 || page > 100000 || pageSize < 1 || pageSize > 50 {
		return nil, 0, ErrInvalidInput
	}
	return s.repo.List(ctx, publicOnly, page, pageSize)
}

func (s *SayService) Save(ctx context.Context, id int64, input model.Say) (model.Say, error) {
	input.Text = strings.TrimSpace(input.Text)
	input.Source = strings.TrimSpace(input.Source)
	input.Author = strings.TrimSpace(input.Author)
	if id < 0 || utf8.RuneCountInString(input.Text) < 1 || utf8.RuneCountInString(input.Text) > 1000 ||
		utf8.RuneCountInString(input.Source) > 120 || utf8.RuneCountInString(input.Author) > 80 {
		return model.Say{}, ErrInvalidInput
	}
	return s.repo.Save(ctx, id, input)
}

func (s *SayService) Delete(ctx context.Context, id int64) error {
	if id < 1 {
		return ErrInvalidInput
	}
	return s.repo.Delete(ctx, id)
}
