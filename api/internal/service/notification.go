package service

import (
	"context"
	"github.com/kakozane/kakozane-blog/api/internal/model"
)

func (s *CommentService) Notifications(ctx context.Context, user int64, page int) ([]model.ReplyNotification, int64, error) {
	if page < 1 || page > 100000 {
		return nil, 0, ErrInvalidInput
	}
	return s.repo.Notifications(ctx, user, page)
}
func (s *CommentService) ReadNotification(ctx context.Context, user, id int64) error {
	if id < 1 {
		return ErrInvalidInput
	}
	return s.repo.ReadNotification(ctx, user, id)
}
