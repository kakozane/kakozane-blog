package service

import (
	"bytes"
	"context"
	"image"
	_ "image/gif"
	_ "image/jpeg"
	_ "image/png"
	"io"
	"net/http"

	"github.com/kakozane/kakozane-blog/api/internal/model"
	"github.com/kakozane/kakozane-blog/api/internal/repository"
	_ "golang.org/x/image/webp"
)

const maxImageBytes = 5 << 20

type MediaService struct{ repo *repository.MediaRepository }

func NewMediaService(repo *repository.MediaRepository) *MediaService {
	return &MediaService{repo: repo}
}

func (s *MediaService) Upload(ctx context.Context, ownerID int64, reader io.Reader) (model.Media, error) {
	data, err := io.ReadAll(io.LimitReader(reader, maxImageBytes+1))
	if err != nil {
		return model.Media{}, err
	}
	if ownerID < 1 || len(data) == 0 || len(data) > maxImageBytes {
		return model.Media{}, ErrInvalidInput
	}
	mime := http.DetectContentType(data)
	extensions := map[string]string{"image/jpeg": ".jpg", "image/png": ".png", "image/gif": ".gif", "image/webp": ".webp"}
	extension, ok := extensions[mime]
	if !ok {
		return model.Media{}, ErrInvalidInput
	}
	config, _, err := image.DecodeConfig(bytes.NewReader(data))
	if err != nil || config.Width < 1 || config.Height < 1 || config.Width > 8000 || config.Height > 8000 || int64(config.Width)*int64(config.Height) > 36_000_000 {
		return model.Media{}, ErrInvalidInput
	}
	return s.repo.Save(ctx, ownerID, data, extension, mime, config.Width, config.Height)
}

func (s *MediaService) List(ctx context.Context, page int) ([]model.Media, int64, error) {
	if page < 1 || page > 100000 {
		return nil, 0, ErrInvalidInput
	}
	return s.repo.List(ctx, page)
}

func (s *MediaService) Delete(ctx context.Context, id int64) error {
	if id < 1 {
		return ErrInvalidInput
	}
	return s.repo.Delete(ctx, id)
}
