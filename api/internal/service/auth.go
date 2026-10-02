package service

import (
	"context"
	"crypto/rand"
	"database/sql"
	"encoding/base64"
	"errors"
	"strings"

	"github.com/kakozane/kakozane-blog/api/internal/password"
	"github.com/kakozane/kakozane-blog/api/internal/repository"
	"github.com/redis/go-redis/v9"
)

const (
	ScopeFront = "front"
	ScopeAdmin = "admin"
)

var (
	ErrInvalidCredentials = errors.New("invalid credentials")
	ErrRateLimited        = errors.New("too many login attempts")
	ErrUnauthenticated    = errors.New("not authenticated")
	ErrForbidden          = errors.New("permission denied")
)

type AuthService struct {
	repo *repository.AuthRepository
}

func NewAuthService(repo *repository.AuthRepository) *AuthService {
	return &AuthService{repo: repo}
}

func (s *AuthService) Login(ctx context.Context, username, secret, scope string) (repository.User, string, error) {
	username = strings.ToLower(strings.TrimSpace(username))
	if username == "" || len(username) > 64 || secret == "" || len(secret) > 128 {
		return repository.User{}, "", ErrInvalidCredentials
	}
	count, err := s.repo.FailedLogins(ctx, username)
	if err != nil {
		return repository.User{}, "", err
	}
	if count >= 10 {
		return repository.User{}, "", ErrRateLimited
	}
	user, err := s.repo.FindByUsername(ctx, username)
	if err != nil && !errors.Is(err, sql.ErrNoRows) {
		return repository.User{}, "", err
	}
	if err != nil || user.Status != "active" || !password.Verify(secret, user.PasswordHash) || (scope == ScopeAdmin && user.Role != "admin") {
		if err := s.repo.RecordFailedLogin(ctx, username); err != nil {
			return repository.User{}, "", err
		}
		return repository.User{}, "", ErrInvalidCredentials
	}
	token, err := s.newSession(ctx, scope, user)
	if err != nil {
		return repository.User{}, "", err
	}
	if err := s.repo.ClearFailedLogins(ctx, username); err != nil {
		return repository.User{}, "", err
	}
	return user, token, nil
}

func randomAuthToken() (string, error) {
	random := make([]byte, 32)
	if _, err := rand.Read(random); err != nil {
		return "", err
	}
	return base64.RawURLEncoding.EncodeToString(random), nil
}

func (s *AuthService) newSession(ctx context.Context, scope string, user repository.User) (string, error) {
	token, err := randomAuthToken()
	if err != nil {
		return "", err
	}
	if err := s.repo.SaveSession(ctx, scope, token, user.ID, user.SessionVersion); err != nil {
		return "", err
	}
	return token, nil
}

func (s *AuthService) CurrentUser(ctx context.Context, scope, token string) (repository.User, error) {
	if token == "" {
		return repository.User{}, ErrUnauthenticated
	}
	id, version, err := s.repo.SessionUserID(ctx, scope, token)
	if errors.Is(err, redis.Nil) {
		return repository.User{}, ErrUnauthenticated
	}
	if err != nil {
		return repository.User{}, err
	}
	user, err := s.repo.FindByID(ctx, id)
	if errors.Is(err, sql.ErrNoRows) {
		return repository.User{}, ErrUnauthenticated
	}
	if err != nil {
		return repository.User{}, err
	}
	if user.Status != "active" || user.SessionVersion != version || (scope == ScopeAdmin && user.Role != "admin") {
		return repository.User{}, ErrUnauthenticated
	}
	return user, nil
}

func (s *AuthService) Logout(ctx context.Context, scope, token string) error {
	if token == "" {
		return nil
	}
	return s.repo.DeleteSession(ctx, scope, token)
}
