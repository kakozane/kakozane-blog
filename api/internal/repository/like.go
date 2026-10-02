package repository

import (
	"context"
	"database/sql"

	"github.com/kakozane/kakozane-blog/api/internal/model"
)

type LikeRepository struct{ db *sql.DB }

func NewLikeRepository(db *sql.DB) *LikeRepository { return &LikeRepository{db: db} }

func (r *LikeRepository) State(ctx context.Context, postID, userID int64) (model.LikeState, error) {
	var state model.LikeState
	if err := r.db.QueryRowContext(ctx, "SELECT COUNT(*) FROM post_likes WHERE post_id = ?", postID).Scan(&state.Count); err != nil {
		return state, err
	}
	if userID > 0 {
		if err := r.db.QueryRowContext(ctx, "SELECT EXISTS(SELECT 1 FROM post_likes WHERE post_id = ? AND user_id = ?)", postID, userID).Scan(&state.Liked); err != nil {
			return state, err
		}
	}
	return state, nil
}

func (r *LikeRepository) Set(ctx context.Context, postID, userID int64, liked bool) error {
	if liked {
		_, err := r.db.ExecContext(ctx, "INSERT INTO post_likes (post_id, user_id) VALUES (?, ?) ON DUPLICATE KEY UPDATE user_id = user_id", postID, userID)
		return err
	}
	_, err := r.db.ExecContext(ctx, "DELETE FROM post_likes WHERE post_id = ? AND user_id = ?", postID, userID)
	return err
}

func (r *LikeRepository) RecentPublic(ctx context.Context, limit int) ([]model.RecentLike, error) {
	rows, err := r.db.QueryContext(ctx, `SELECT p.kind, p.slug, p.title, l.created_at
		FROM post_likes l JOIN posts p ON p.id = l.post_id
		WHERE p.status = 'published'
		ORDER BY l.created_at DESC, l.post_id DESC, l.user_id DESC LIMIT ?`, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	items := []model.RecentLike{}
	for rows.Next() {
		var item model.RecentLike
		if err := rows.Scan(&item.Kind, &item.Slug, &item.Title, &item.CreatedAt); err != nil {
			return nil, err
		}
		items = append(items, item)
	}
	return items, rows.Err()
}

func (r *LikeRepository) Mine(ctx context.Context, userID int64, page, pageSize int) ([]model.LikedPost, int64, error) {
	const where = " FROM post_likes l JOIN posts p ON p.id = l.post_id WHERE l.user_id = ? AND p.status = 'published'"
	var total int64
	if err := r.db.QueryRowContext(ctx, "SELECT COUNT(*)"+where, userID).Scan(&total); err != nil {
		return nil, 0, err
	}
	rows, err := r.db.QueryContext(ctx, "SELECT p.kind, p.slug, p.title, l.created_at"+where+
		" ORDER BY l.created_at DESC, l.post_id DESC LIMIT ? OFFSET ?", userID, pageSize, (page-1)*pageSize)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()
	items := []model.LikedPost{}
	for rows.Next() {
		var item model.LikedPost
		if err := rows.Scan(&item.Kind, &item.Slug, &item.Title, &item.LikedAt); err != nil {
			return nil, 0, err
		}
		items = append(items, item)
	}
	return items, total, rows.Err()
}
