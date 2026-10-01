package repository

import (
	"context"
	"database/sql"
	"fmt"

	"github.com/redis/go-redis/v9"
)

type HealthRepository struct {
	db    *sql.DB
	redis *redis.Client
}

func NewHealthRepository(db *sql.DB, redisClient *redis.Client) *HealthRepository {
	return &HealthRepository{db: db, redis: redisClient}
}

func (r *HealthRepository) Check(ctx context.Context) error {
	if err := r.db.PingContext(ctx); err != nil {
		return fmt.Errorf("mysql: %w", err)
	}
	if err := r.redis.Ping(ctx).Err(); err != nil {
		return fmt.Errorf("redis: %w", err)
	}
	return nil
}
