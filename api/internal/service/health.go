package service

import (
	"context"
	"time"

	"github.com/kakozane/kakozane-blog/api/internal/repository"
)

type HealthService struct {
	repo *repository.HealthRepository
}

func NewHealthService(repo *repository.HealthRepository) *HealthService {
	return &HealthService{repo: repo}
}

func (s *HealthService) Check(ctx context.Context) error {
	ctx, cancel := context.WithTimeout(ctx, 2*time.Second)
	defer cancel()
	return s.repo.Check(ctx)
}
