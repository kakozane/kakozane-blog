package repository

import (
	"context"
	"github.com/kakozane/kakozane-blog/api/internal/model"
)

func (r *CommentRepository) Notifications(ctx context.Context, user int64, page int) ([]model.ReplyNotification, int64, error) {
	const from = ` FROM reply_notifications n JOIN comments c ON c.id=n.comment_id JOIN comments parent ON parent.id=c.parent_id JOIN posts p ON p.id=c.post_id WHERE n.user_id=? AND c.status='approved' AND parent.status='approved' AND p.status='published'`
	var unread int64
	if err := r.db.QueryRowContext(ctx, "SELECT COUNT(*)"+from+" AND n.read_at IS NULL", user).Scan(&unread); err != nil {
		return nil, 0, err
	}
	rows, err := r.db.QueryContext(ctx, "SELECT n.id,c.id,p.kind,p.slug,p.title,c.author_name,c.body,n.read_at IS NOT NULL,n.created_at"+from+" ORDER BY n.id DESC LIMIT 20 OFFSET ?", user, (page-1)*20)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()
	items := []model.ReplyNotification{}
	for rows.Next() {
		var n model.ReplyNotification
		if err := rows.Scan(&n.ID, &n.CommentID, &n.Kind, &n.Slug, &n.Title, &n.AuthorName, &n.Body, &n.Read, &n.CreatedAt); err != nil {
			return nil, 0, err
		}
		items = append(items, n)
	}
	return items, unread, rows.Err()
}
func (r *CommentRepository) ReadNotification(ctx context.Context, user, id int64) error {
	result, err := r.db.ExecContext(ctx, "UPDATE reply_notifications SET read_at=COALESCE(read_at,CURRENT_TIMESTAMP) WHERE id=? AND user_id=?", id, user)
	// An already-read notification is also a successful idempotent operation.
	if err != nil {
		return err
	}
	_ = result
	return nil
}
