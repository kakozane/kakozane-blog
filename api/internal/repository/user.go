package repository

import (
	"context"
	"crypto/sha256"
	"database/sql"
	"encoding/hex"
	"errors"
	"strings"
	"time"

	"github.com/kakozane/kakozane-blog/api/internal/model"
	"github.com/redis/go-redis/v9"
)

var ErrLastAdmin = errors.New("cannot disable last admin")

type UserRepository struct {
	db    *sql.DB
	redis *redis.Client
}

func NewUserRepository(db *sql.DB, redisClient *redis.Client) *UserRepository {
	return &UserRepository{db: db, redis: redisClient}
}

func (r *UserRepository) RegistrationAttempts(ctx context.Context, ip string) (int64, error) {
	hash := sha256.Sum256([]byte(ip))
	key := "register:ip:" + hex.EncodeToString(hash[:])
	pipe := r.redis.TxPipeline()
	count := pipe.Incr(ctx, key)
	pipe.Expire(ctx, key, time.Hour)
	if _, err := pipe.Exec(ctx); err != nil {
		return 0, err
	}
	return count.Val(), nil
}

func (r *UserRepository) List(ctx context.Context, page, pageSize int, query string) ([]model.User, int64, error) {
	where := " WHERE 1 = 1"
	args := []any{}
	if query != "" {
		where += " AND (username LIKE ? OR display_name LIKE ?)"
		value := "%" + query + "%"
		args = append(args, value, value)
	}
	var total int64
	if err := r.db.QueryRowContext(ctx, "SELECT COUNT(*) FROM users"+where, args...).Scan(&total); err != nil {
		return nil, 0, err
	}
	rows, err := r.db.QueryContext(ctx, "SELECT id, username, display_name, role, status, created_at, updated_at FROM users"+where+" ORDER BY id DESC LIMIT ? OFFSET ?", append(args, pageSize, (page-1)*pageSize)...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()
	items := []model.User{}
	for rows.Next() {
		var item model.User
		if err := rows.Scan(&item.ID, &item.Username, &item.DisplayName, &item.Role, &item.Status, &item.CreatedAt, &item.UpdatedAt); err != nil {
			return nil, 0, err
		}
		items = append(items, item)
	}
	return items, total, rows.Err()
}

func (r *UserRepository) ByID(ctx context.Context, id int64) (model.User, error) {
	var item model.User
	err := r.db.QueryRowContext(ctx, "SELECT id, username, display_name, role, status, created_at, updated_at FROM users WHERE id = ?", id).
		Scan(&item.ID, &item.Username, &item.DisplayName, &item.Role, &item.Status, &item.CreatedAt, &item.UpdatedAt)
	if errors.Is(err, sql.ErrNoRows) {
		return model.User{}, ErrNotFound
	}
	return item, err
}

func (r *UserRepository) Create(ctx context.Context, input model.UserInput, hash string) (model.User, error) {
	result, err := r.db.ExecContext(ctx, "INSERT INTO users (username, display_name, password_hash, role) VALUES (?, ?, ?, ?)", input.Username, input.DisplayName, hash, input.Role)
	if err != nil {
		return model.User{}, err
	}
	id, err := result.LastInsertId()
	if err != nil {
		return model.User{}, err
	}
	return r.ByID(ctx, id)
}

func (r *UserRepository) Update(ctx context.Context, id int64, input model.UserUpdate) (model.User, error) {
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return model.User{}, err
	}
	defer tx.Rollback()
	activeAdmins, err := lockActiveAdmins(ctx, tx)
	if err != nil {
		return model.User{}, err
	}
	if activeAdmins[id] && len(activeAdmins) == 1 && (input.Role != "admin" || input.Status != "active") {
		return model.User{}, ErrLastAdmin
	}
	var currentRole, currentStatus string
	if err := tx.QueryRowContext(ctx, "SELECT role, status FROM users WHERE id = ? FOR UPDATE", id).Scan(&currentRole, &currentStatus); errors.Is(err, sql.ErrNoRows) {
		return model.User{}, ErrNotFound
	} else if err != nil {
		return model.User{}, err
	}
	bump := 0
	if currentRole != input.Role || currentStatus != input.Status {
		bump = 1
	}
	result, err := tx.ExecContext(ctx, "UPDATE users SET display_name = ?, role = ?, status = ?, session_version = session_version + ? WHERE id = ?", input.DisplayName, input.Role, input.Status, bump, id)
	if err := affected(result, err); err != nil {
		return model.User{}, err
	}
	if err := tx.Commit(); err != nil {
		return model.User{}, err
	}
	return r.ByID(ctx, id)
}

func (r *UserRepository) UpdateProfile(ctx context.Context, id int64, displayName string) (model.User, error) {
	result, err := r.db.ExecContext(ctx, "UPDATE users SET display_name = ? WHERE id = ?", strings.TrimSpace(displayName), id)
	if err := affected(result, err); err != nil {
		return model.User{}, err
	}
	return r.ByID(ctx, id)
}

func (r *UserRepository) PasswordHash(ctx context.Context, id int64) (string, error) {
	var hash string
	err := r.db.QueryRowContext(ctx, "SELECT password_hash FROM users WHERE id = ?", id).Scan(&hash)
	if errors.Is(err, sql.ErrNoRows) {
		return "", ErrNotFound
	}
	return hash, err
}

func (r *UserRepository) SetPassword(ctx context.Context, id int64, hash string) error {
	result, err := r.db.ExecContext(ctx, "UPDATE users SET password_hash = ?, session_version = session_version + 1 WHERE id = ?", hash, id)
	return affected(result, err)
}

func (r *UserRepository) Delete(ctx context.Context, id int64) error {
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()
	activeAdmins, err := lockActiveAdmins(ctx, tx)
	if err != nil {
		return err
	}
	var exists int64
	if err := tx.QueryRowContext(ctx, "SELECT id FROM users WHERE id = ? FOR UPDATE", id).Scan(&exists); errors.Is(err, sql.ErrNoRows) {
		return ErrNotFound
	} else if err != nil {
		return err
	}
	if activeAdmins[id] && len(activeAdmins) == 1 {
		return ErrLastAdmin
	}
	result, err := tx.ExecContext(ctx, "DELETE FROM users WHERE id = ?", id)
	if err := affected(result, err); err != nil {
		return err
	}
	return tx.Commit()
}

func lockActiveAdmins(ctx context.Context, tx *sql.Tx) (map[int64]bool, error) {
	// Lock all active admins so concurrent updates and deletes preserve at least one.
	rows, err := tx.QueryContext(ctx, "SELECT id FROM users WHERE role = 'admin' AND status = 'active' FOR UPDATE")
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	ids := map[int64]bool{}
	for rows.Next() {
		var id int64
		if err := rows.Scan(&id); err != nil {
			return nil, err
		}
		ids[id] = true
	}
	return ids, rows.Err()
}
