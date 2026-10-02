package service

import (
	"context"
	"errors"
	"strings"
	"testing"
)

func TestCommentEditRejectsInvalidInputBeforeDatabase(t *testing.T) {
	svc := NewCommentService(nil, nil, nil)
	for _, input := range []struct {
		userID, commentID int64
		body              string
	}{
		{0, 1, "hello"},
		{1, 0, "hello"},
		{1, 1, "   "},
		{1, 1, strings.Repeat("好", 2001)},
	} {
		_, err := svc.Edit(context.Background(), "post", "post", input.userID, input.commentID, input.body)
		if !errors.Is(err, ErrInvalidInput) {
			t.Fatalf("Edit(%+v) = %v, want invalid input", input, err)
		}
	}
}
