package repository

import (
	"context"
	"crypto/sha256"
	"database/sql"
	"encoding/hex"
	"strconv"
	"time"

	"github.com/redis/go-redis/v9"
)

type User struct {
	ID           int64
	Username     string
	DisplayName  string
	PasswordHash string
	Role         string
}

type AuthRepository struct {
	db    *sql.DB
	redis *redis.Client
}

func NewAuthRepository(db *sql.DB, redisClient *redis.Client) *AuthRepository {
	return &AuthRepository{db: db, redis: redisClient}
}

func (r *AuthRepository) FindByUsername(ctx context.Context, username string) (User, error) {
	var user User
	err := r.db.QueryRowContext(ctx, "SELECT id, username, display_name, password_hash, role FROM users WHERE username = ?", username).
		Scan(&user.ID, &user.Username, &user.DisplayName, &user.PasswordHash, &user.Role)
	return user, err
}

func (r *AuthRepository) FindByID(ctx context.Context, id int64) (User, error) {
	var user User
	err := r.db.QueryRowContext(ctx, "SELECT id, username, display_name, password_hash, role FROM users WHERE id = ?", id).
		Scan(&user.ID, &user.Username, &user.DisplayName, &user.PasswordHash, &user.Role)
	return user, err
}

func (r *AuthRepository) SaveSession(ctx context.Context, scope, token string, userID int64) error {
	return r.redis.Set(ctx, sessionKey(scope, token), userID, 12*time.Hour).Err()
}

func (r *AuthRepository) SessionUserID(ctx context.Context, scope, token string) (int64, error) {
	value, err := r.redis.Get(ctx, sessionKey(scope, token)).Result()
	if err != nil {
		return 0, err
	}
	return strconv.ParseInt(value, 10, 64)
}

func (r *AuthRepository) DeleteSession(ctx context.Context, scope, token string) error {
	return r.redis.Del(ctx, sessionKey(scope, token)).Err()
}

func (r *AuthRepository) FailedLogins(ctx context.Context, username string) (int64, error) {
	count, err := r.redis.Get(ctx, failureKey(username)).Int64()
	if err == redis.Nil {
		return 0, nil
	}
	return count, err
}

func (r *AuthRepository) RecordFailedLogin(ctx context.Context, username string) error {
	key := failureKey(username)
	pipe := r.redis.TxPipeline()
	pipe.Incr(ctx, key)
	pipe.Expire(ctx, key, 15*time.Minute)
	_, err := pipe.Exec(ctx)
	return err
}

func (r *AuthRepository) ClearFailedLogins(ctx context.Context, username string) error {
	return r.redis.Del(ctx, failureKey(username)).Err()
}

func sessionKey(scope, token string) string {
	hash := sha256.Sum256([]byte(token))
	return "session:" + scope + ":" + hex.EncodeToString(hash[:])
}

func failureKey(username string) string {
	hash := sha256.Sum256([]byte(username))
	return "login:fail:" + hex.EncodeToString(hash[:])
}
