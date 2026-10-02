package service

import (
	"context"
	"net/url"
	"strings"
	"unicode/utf8"

	"github.com/kakozane/kakozane-blog/api/internal/model"
	"github.com/kakozane/kakozane-blog/api/internal/repository"
)

type FriendService struct{ repo *repository.FriendRepository }

func NewFriendService(repo *repository.FriendRepository) *FriendService {
	return &FriendService{repo: repo}
}

func (s *FriendService) List(ctx context.Context, publicOnly bool) ([]model.FriendLink, error) {
	return s.repo.List(ctx, publicOnly)
}

func (s *FriendService) Save(ctx context.Context, id int64, input model.FriendLink) (model.FriendLink, error) {
	input.Kind = strings.TrimSpace(input.Kind)
	input.Name = strings.TrimSpace(input.Name)
	input.URL = strings.TrimSpace(input.URL)
	input.Description = strings.TrimSpace(input.Description)
	input.AvatarURL = strings.TrimSpace(input.AvatarURL)
	if id < 0 || (input.Kind != "friend" && input.Kind != "collection") ||
		utf8.RuneCountInString(input.Name) < 1 || utf8.RuneCountInString(input.Name) > 80 ||
		utf8.RuneCountInString(input.Description) > 240 ||
		!validExternalURL(input.URL) || !validCoverURL(input.AvatarURL) ||
		input.SortOrder < -10000 || input.SortOrder > 10000 {
		return model.FriendLink{}, ErrInvalidInput
	}
	return s.repo.Save(ctx, id, input)
}

func (s *FriendService) Delete(ctx context.Context, id int64) error {
	if id < 1 {
		return ErrInvalidInput
	}
	return s.repo.Delete(ctx, id)
}

func validExternalURL(value string) bool {
	if len(value) > 1024 {
		return false
	}
	parsed, err := url.Parse(value)
	return err == nil && parsed.Scheme == "https" && parsed.Hostname() != "" && parsed.User == nil && parsed.Opaque == ""
}
