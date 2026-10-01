package repository

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/kakozane/kakozane-blog/api/internal/model"
	"github.com/redis/go-redis/v9"
)

type CommentRepository struct {
	db    *sql.DB
	redis *redis.Client
}

func NewCommentRepository(db *sql.DB, redisClient *redis.Client) *CommentRepository {
	return &CommentRepository{db: db, redis: redisClient}
}

func (r *CommentRepository) ReserveCommentSlot(ctx context.Context, userID int64) (bool, error) {
	return r.redis.SetNX(ctx, fmt.Sprintf("comment:cooldown:%d", userID), "1", 30*time.Second).Result()
}

func (r *CommentRepository) ParentIsApproved(ctx context.Context, postID, parentID int64) (bool, error) {
	var exists bool
	err := r.db.QueryRowContext(ctx, "SELECT EXISTS(SELECT 1 FROM comments WHERE id = ? AND post_id = ? AND status = 'approved')", parentID, postID).Scan(&exists)
	return exists, err
}

func (r *CommentRepository) Create(ctx context.Context, postID, userID int64, authorName string, input model.CommentInput) (model.Comment, error) {
	result, err := r.db.ExecContext(ctx, "INSERT INTO comments (post_id, user_id, author_name, parent_id, body) VALUES (?, ?, ?, ?, ?)", postID, userID, authorName, input.ParentID, input.Body)
	if err != nil {
		return model.Comment{}, err
	}
	id, err := result.LastInsertId()
	if err != nil {
		return model.Comment{}, err
	}
	return r.ByID(ctx, id)
}

func (r *CommentRepository) ByID(ctx context.Context, id int64) (model.Comment, error) {
	var item model.Comment
	var userID, parentID sql.NullInt64
	err := r.db.QueryRowContext(ctx, "SELECT id, post_id, user_id, author_name, parent_id, body, status, created_at FROM comments WHERE id = ?", id).
		Scan(&item.ID, &item.PostID, &userID, &item.AuthorName, &parentID, &item.Body, &item.Status, &item.CreatedAt)
	if errors.Is(err, sql.ErrNoRows) {
		return model.Comment{}, ErrNotFound
	}
	if err != nil {
		return model.Comment{}, err
	}
	if userID.Valid {
		item.UserID = &userID.Int64
	}
	if parentID.Valid {
		item.ParentID = &parentID.Int64
	}
	return item, nil
}

func (r *CommentRepository) List(ctx context.Context, postID int64, status string, page, pageSize int) ([]model.Comment, int64, error) {
	where := []string{"1 = 1"}
	args := []any{}
	if postID != 0 {
		where = append(where, "c.post_id = ?")
		args = append(args, postID)
	}
	if status != "" {
		where = append(where, "c.status = ?")
		args = append(args, status)
	}
	from := " FROM comments c JOIN posts p ON p.id = c.post_id WHERE " + strings.Join(where, " AND ")
	var total int64
	if err := r.db.QueryRowContext(ctx, "SELECT COUNT(*)"+from, args...).Scan(&total); err != nil {
		return nil, 0, err
	}
	order := "c.created_at DESC, c.id DESC"
	if postID != 0 {
		order = "c.created_at ASC, c.id ASC"
	}
	rows, err := r.db.QueryContext(ctx, "SELECT c.id, c.post_id, p.title, c.user_id, c.author_name, c.parent_id, c.body, c.status, c.created_at"+from+" ORDER BY "+order+" LIMIT ? OFFSET ?", append(args, pageSize, (page-1)*pageSize)...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()
	items := []model.Comment{}
	for rows.Next() {
		var item model.Comment
		var userID, parentID sql.NullInt64
		if err := rows.Scan(&item.ID, &item.PostID, &item.PostTitle, &userID, &item.AuthorName, &parentID, &item.Body, &item.Status, &item.CreatedAt); err != nil {
			return nil, 0, err
		}
		if userID.Valid {
			item.UserID = &userID.Int64
		}
		if parentID.Valid {
			item.ParentID = &parentID.Int64
		}
		items = append(items, item)
	}
	return items, total, rows.Err()
}

func (r *CommentRepository) SetStatus(ctx context.Context, id int64, status string) (model.Comment, error) {
	result, err := r.db.ExecContext(ctx, "UPDATE comments SET status = ? WHERE id = ?", status, id)
	if err := affected(result, err); err != nil {
		return model.Comment{}, err
	}
	return r.ByID(ctx, id)
}

func (r *CommentRepository) Delete(ctx context.Context, id int64) error {
	result, err := r.db.ExecContext(ctx, "DELETE FROM comments WHERE id = ?", id)
	return affected(result, err)
}
