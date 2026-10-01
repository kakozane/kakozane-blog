package service

import (
	"context"
	"crypto/rand"
	"encoding/base64"
	"errors"
	"regexp"
	"strings"
	"unicode/utf8"

	"github.com/kakozane/kakozane-blog/api/internal/model"
	"github.com/kakozane/kakozane-blog/api/internal/password"
	"github.com/kakozane/kakozane-blog/api/internal/repository"
)

var usernamePattern = regexp.MustCompile(`^[a-z0-9_]{3,64}$`)
var ErrRegistrationRateLimited = errors.New("registration rate limited")

type UserService struct{ repo *repository.UserRepository }

func NewUserService(repo *repository.UserRepository) *UserService { return &UserService{repo: repo} }

func (s *UserService) List(ctx context.Context, page, pageSize int, query string) ([]model.User, int64, error) {
	if page < 1 || page > 100000 || pageSize < 1 || pageSize > 50 || len(query) > 100 {
		return nil, 0, ErrInvalidInput
	}
	return s.repo.List(ctx, page, pageSize, strings.TrimSpace(query))
}

func (s *UserService) Create(ctx context.Context, input model.UserInput) (model.User, error) {
	input.Username = strings.ToLower(strings.TrimSpace(input.Username))
	input.DisplayName = strings.TrimSpace(input.DisplayName)
	if !usernamePattern.MatchString(input.Username) || !validDisplayName(input.DisplayName) || (input.Role != "reader" && input.Role != "admin") {
		return model.User{}, ErrInvalidInput
	}
	hash, err := password.Hash(input.Password)
	if err != nil {
		return model.User{}, ErrInvalidInput
	}
	user, err := s.repo.Create(ctx, input, hash)
	return user, contentWriteError(err)
}

func (s *UserService) Register(ctx context.Context, input model.UserInput, ip string) (model.User, error) {
	count, err := s.repo.RegistrationAttempts(ctx, ip)
	if err != nil {
		return model.User{}, err
	}
	// ponytail: one IP gets five attempts per hour; add CAPTCHA if public signups draw abuse.
	if count > 5 {
		return model.User{}, ErrRegistrationRateLimited
	}
	input.Role = "reader"
	return s.Create(ctx, input)
}

func (s *UserService) Update(ctx context.Context, id int64, input model.UserUpdate) (model.User, error) {
	input.DisplayName = strings.TrimSpace(input.DisplayName)
	if id < 1 || !validDisplayName(input.DisplayName) || (input.Role != "reader" && input.Role != "admin") || (input.Status != "active" && input.Status != "disabled") {
		return model.User{}, ErrInvalidInput
	}
	return s.repo.Update(ctx, id, input)
}

func (s *UserService) UpdateProfile(ctx context.Context, id int64, displayName string) (model.User, error) {
	displayName = strings.TrimSpace(displayName)
	if id < 1 || !validDisplayName(displayName) {
		return model.User{}, ErrInvalidInput
	}
	return s.repo.UpdateProfile(ctx, id, displayName)
}

func (s *UserService) ChangePassword(ctx context.Context, id int64, oldPassword, newPassword string) error {
	if id < 1 || oldPassword == newPassword {
		return ErrInvalidInput
	}
	currentHash, err := s.repo.PasswordHash(ctx, id)
	if err != nil {
		return err
	}
	if !password.Verify(oldPassword, currentHash) {
		return ErrInvalidCredentials
	}
	hash, err := password.Hash(newPassword)
	if err != nil {
		return ErrInvalidInput
	}
	return s.repo.SetPassword(ctx, id, hash)
}

func (s *UserService) ResetPassword(ctx context.Context, id int64) (string, error) {
	if id < 1 {
		return "", ErrInvalidInput
	}
	random := make([]byte, 24)
	if _, err := rand.Read(random); err != nil {
		return "", err
	}
	secret := base64.RawURLEncoding.EncodeToString(random)
	hash, err := password.Hash(secret)
	if err != nil {
		return "", err
	}
	if err := s.repo.SetPassword(ctx, id, hash); err != nil {
		return "", err
	}
	return secret, nil
}

func (s *UserService) Delete(ctx context.Context, id int64) error {
	if id < 1 {
		return ErrInvalidInput
	}
	return contentWriteError(s.repo.Delete(ctx, id))
}

func validDisplayName(value string) bool {
	count := utf8.RuneCountInString(value)
	return count >= 1 && count <= 100
}
