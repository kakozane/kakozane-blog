package service

import (
	"context"
	"encoding/json"
	"github.com/kakozane/kakozane-blog/api/internal/model"
	"regexp"
)

var draftKeyPattern = regexp.MustCompile(`^(post|note)-(new|[1-9][0-9]*)$`)

func (s *ContentService) Revisions(ctx context.Context, id int64) ([]model.Revision, error) {
	if id < 1 {
		return nil, ErrInvalidInput
	}
	return s.repo.Revisions(ctx, id)
}
func (s *ContentService) RestorePost(ctx context.Context, id int64) error {
	if id < 1 {
		return ErrInvalidInput
	}
	return s.repo.RestorePost(ctx, id)
}
func (s *ContentService) PurgePost(ctx context.Context, id int64) error {
	if id < 1 {
		return ErrInvalidInput
	}
	return s.repo.PurgePost(ctx, id)
}
func (s *ContentService) Draft(ctx context.Context, user int64, key string) (model.WritingDraft, error) {
	if !draftKeyPattern.MatchString(key) {
		return model.WritingDraft{}, ErrInvalidInput
	}
	return s.repo.Draft(ctx, user, key)
}
func (s *ContentService) SaveDraft(ctx context.Context, user int64, key string, input model.WritingDraft) (model.WritingDraft, error) {
	raw, err := json.Marshal(input.Snapshot)
	if err != nil || !draftKeyPattern.MatchString(key) || input.Version < 0 || len(raw) > 2*1024*1024 || len(input.Snapshot.ContentMD) > 1024*1024 {
		return model.WritingDraft{}, ErrInvalidInput
	}
	return s.repo.SaveDraft(ctx, user, key, input)
}
func (s *ContentService) DeleteDraft(ctx context.Context, user int64, key string, version int64) error {
	if !draftKeyPattern.MatchString(key) || version < 1 {
		return ErrInvalidInput
	}
	return s.repo.DeleteDraft(ctx, user, key, version)
}
