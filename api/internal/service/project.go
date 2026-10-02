package service

import (
	"context"
	"strings"
	"unicode/utf8"

	"github.com/kakozane/kakozane-blog/api/internal/model"
	"github.com/kakozane/kakozane-blog/api/internal/repository"
)

type ProjectService struct{ repo *repository.ProjectRepository }

func NewProjectService(repo *repository.ProjectRepository) *ProjectService {
	return &ProjectService{repo: repo}
}

func (s *ProjectService) List(ctx context.Context, publicOnly bool) ([]model.Project, error) {
	return s.repo.List(ctx, publicOnly)
}

func (s *ProjectService) Save(ctx context.Context, id int64, input model.Project) (model.Project, error) {
	input.Name = strings.TrimSpace(input.Name)
	input.URL = strings.TrimSpace(input.URL)
	input.Description = strings.TrimSpace(input.Description)
	input.AvatarURL = strings.TrimSpace(input.AvatarURL)
	if id < 0 || utf8.RuneCountInString(input.Name) < 1 || utf8.RuneCountInString(input.Name) > 80 ||
		utf8.RuneCountInString(input.Description) > 240 || !validExternalURL(input.URL) ||
		!validCoverURL(input.AvatarURL) || input.SortOrder < -10000 || input.SortOrder > 10000 {
		return model.Project{}, ErrInvalidInput
	}
	return s.repo.Save(ctx, id, input)
}

func (s *ProjectService) Delete(ctx context.Context, id int64) error {
	if id < 1 {
		return ErrInvalidInput
	}
	return s.repo.Delete(ctx, id)
}
