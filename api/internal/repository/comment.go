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
	err := r.db.QueryRowContext(ctx, "SELECT c.id, c.post_id, c.user_id, c.author_name, c.parent_id, COALESCE(parent.author_name, ''), c.body, c.status, c.pinned, c.created_at FROM comments c LEFT JOIN comments parent ON parent.id = c.parent_id AND parent.status = 'approved' WHERE c.id = ?", id).
		Scan(&item.ID, &item.PostID, &userID, &item.AuthorName, &parentID, &item.ParentAuthorName, &item.Body, &item.Status, &item.Pinned, &item.CreatedAt)
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

func (r *CommentRepository) List(ctx context.Context, postID, userID int64, statuses []string, page, pageSize int) ([]model.Comment, int64, error) {
	where := []string{"1 = 1"}
	args := []any{}
	if postID != 0 {
		where = append(where, "c.post_id = ?")
		args = append(args, postID)
	}
	if userID != 0 {
		where = append(where, "c.user_id = ?")
		args = append(args, userID)
	}
	if len(statuses) > 0 {
		placeholders := strings.TrimSuffix(strings.Repeat("?,", len(statuses)), ",")
		where = append(where, "c.status IN ("+placeholders+")")
		for _, status := range statuses {
			args = append(args, status)
		}
	}
	from := " FROM comments c JOIN posts p ON p.id = c.post_id LEFT JOIN comments parent ON parent.id = c.parent_id AND parent.status = 'approved' WHERE " + strings.Join(where, " AND ")
	var total int64
	if err := r.db.QueryRowContext(ctx, "SELECT COUNT(*)"+from, args...).Scan(&total); err != nil {
		return nil, 0, err
	}
	order := "c.created_at DESC, c.id DESC"
	if postID != 0 && userID == 0 {
		order = "c.pinned DESC, c.created_at ASC, c.id ASC"
	}
	rows, err := r.db.QueryContext(ctx, "SELECT c.id, c.post_id, p.title, p.kind, c.user_id, c.author_name, c.parent_id, COALESCE(parent.author_name, ''), c.body, c.status, c.pinned, c.created_at"+from+" ORDER BY "+order+" LIMIT ? OFFSET ?", append(args, pageSize, (page-1)*pageSize)...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()
	items := []model.Comment{}
	for rows.Next() {
		var item model.Comment
		var userID, parentID sql.NullInt64
		if err := rows.Scan(&item.ID, &item.PostID, &item.PostTitle, &item.PostKind, &userID, &item.AuthorName, &parentID, &item.ParentAuthorName, &item.Body, &item.Status, &item.Pinned, &item.CreatedAt); err != nil {
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

func (r *CommentRepository) RecentPublic(ctx context.Context, limit int) ([]model.RecentComment, error) {
	rows, err := r.db.QueryContext(ctx, `SELECT c.id, p.kind, p.slug, p.title, c.author_name, c.body, c.created_at
		FROM comments c JOIN posts p ON p.id = c.post_id
		WHERE c.status = 'approved' AND p.status = 'published'
		ORDER BY c.created_at DESC, c.id DESC LIMIT ?`, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	items := []model.RecentComment{}
	for rows.Next() {
		var item model.RecentComment
		if err := rows.Scan(&item.ID, &item.Kind, &item.Slug, &item.Title, &item.AuthorName, &item.Body, &item.CreatedAt); err != nil {
			return nil, err
		}
		items = append(items, item)
	}
	return items, rows.Err()
}

func (r *CommentRepository) PublicPageOf(ctx context.Context, postID, id int64) (int, error) {
	var position int64
	err := r.db.QueryRowContext(ctx, `SELECT COUNT(*) FROM comments c
		JOIN comments target ON target.id = ? AND target.post_id = ? AND target.status = 'approved'
		WHERE c.post_id = ? AND c.status = 'approved' AND
		(c.pinned > target.pinned OR (c.pinned = target.pinned AND
		(c.created_at < target.created_at OR (c.created_at = target.created_at AND c.id <= target.id))))`, id, postID, postID).Scan(&position)
	if err != nil {
		return 0, err
	}
	if position == 0 {
		return 0, ErrNotFound
	}
	return int((position-1)/50 + 1), nil
}

func (r *CommentRepository) EditOwn(ctx context.Context, postID, userID, commentID int64, body string) (model.Comment, error) {
	const condition = "id = ? AND post_id = ? AND user_id = ? AND status IN ('pending', 'rejected') AND created_at >= NOW() - INTERVAL 10 MINUTE"
	result, err := r.db.ExecContext(ctx, "UPDATE comments SET body = ?, status = 'pending' WHERE "+condition, body, commentID, postID, userID)
	if err != nil {
		return model.Comment{}, err
	}
	changed, err := result.RowsAffected()
	if err != nil {
		return model.Comment{}, err
	}
	if changed == 0 {
		// MySQL reports zero changed rows when the author saves an unchanged pending comment.
		var unchanged bool
		err = r.db.QueryRowContext(ctx, "SELECT EXISTS(SELECT 1 FROM comments WHERE "+condition+" AND body = ?)", commentID, postID, userID, body).Scan(&unchanged)
		if err != nil {
			return model.Comment{}, err
		}
		if !unchanged {
			return model.Comment{}, ErrNotFound
		}
	}
	return r.ByID(ctx, commentID)
}

func (r *CommentRepository) SetStatus(ctx context.Context, id int64, status string) (model.Comment, error) {
	result, err := r.db.ExecContext(ctx, "UPDATE comments SET status = ?, pinned = CASE WHEN ? = 'approved' THEN pinned ELSE FALSE END WHERE id = ?", status, status, id)
	if err := affected(result, err); err != nil {
		return model.Comment{}, err
	}
	return r.ByID(ctx, id)
}

func (r *CommentRepository) SetPinned(ctx context.Context, id int64, pinned bool) (model.Comment, error) {
	query := "UPDATE comments SET pinned = ? WHERE id = ?"
	if pinned {
		query += " AND status = 'approved' AND parent_id IS NULL"
	}
	result, err := r.db.ExecContext(ctx, query, pinned, id)
	if err := affected(result, err); err != nil {
		return model.Comment{}, err
	}
	return r.ByID(ctx, id)
}

func (r *CommentRepository) Delete(ctx context.Context, id int64) error {
	result, err := r.db.ExecContext(ctx, "DELETE FROM comments WHERE id = ?", id)
	return affected(result, err)
}
