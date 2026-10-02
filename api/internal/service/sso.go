package service

import (
	"context"
	"database/sql"
	"errors"

	"github.com/kakozane/kakozane-blog/api/internal/repository"
	"github.com/redis/go-redis/v9"
)

func (s *AuthService) IssueSSOTicket(ctx context.Context, sourceScope, sourceToken, targetScope, targetOrigin string, expectedUserID int64) (string, error) {
	if !validSSOScopes(sourceScope, targetScope) {
		return "", ErrInvalidInput
	}
	user, err := s.CurrentUser(ctx, sourceScope, sourceToken)
	if err != nil {
		return "", err
	}
	if user.ID != expectedUserID {
		return "", ErrConflict
	}
	if targetScope == ScopeAdmin && user.Role != "admin" {
		return "", ErrForbidden
	}
	ticket, err := randomAuthToken()
	if err != nil {
		return "", err
	}
	if err := s.repo.SaveSSOTicket(ctx, ticket, sourceScope, sourceToken, targetScope, targetOrigin, user); err != nil {
		return "", err
	}
	return ticket, nil
}

func (s *AuthService) ExchangeSSOTicket(ctx context.Context, ticket, scope, origin string) (repository.User, string, error) {
	if (scope != ScopeFront && scope != ScopeAdmin) || len(ticket) != 43 {
		return repository.User{}, "", ErrUnauthenticated
	}
	value, err := s.repo.ConsumeSSOTicket(ctx, ticket, scope, origin)
	if errors.Is(err, redis.Nil) {
		return repository.User{}, "", ErrUnauthenticated
	}
	if err != nil {
		return repository.User{}, "", err
	}
	user, err := s.repo.FindByID(ctx, value.UserID)
	if errors.Is(err, sql.ErrNoRows) {
		return repository.User{}, "", ErrUnauthenticated
	}
	if err != nil {
		return repository.User{}, "", err
	}
	if user.Status != "active" || user.SessionVersion != value.Version {
		return repository.User{}, "", ErrUnauthenticated
	}
	if scope == ScopeAdmin && user.Role != "admin" {
		return repository.User{}, "", ErrForbidden
	}
	token, err := s.newSession(ctx, scope, user)
	return user, token, err
}

func validSSOScopes(source, target string) bool {
	return source == ScopeFront && target == ScopeAdmin || source == ScopeAdmin && target == ScopeFront
}
