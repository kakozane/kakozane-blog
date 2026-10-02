package service

import (
	"context"
	"errors"
	"testing"

	"github.com/kakozane/kakozane-blog/api/internal/model"
)

func TestProjectRejectsInsecureURL(t *testing.T) {
	service := NewProjectService(nil)
	_, err := service.Save(context.Background(), 0, model.Project{Name: "Example", URL: "http://example.com", Visible: true})
	if !errors.Is(err, ErrInvalidInput) {
		t.Fatalf("Save() error = %v, want invalid input", err)
	}
}
