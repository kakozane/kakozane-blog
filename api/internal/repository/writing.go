package repository

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"github.com/kakozane/kakozane-blog/api/internal/model"
	"strings"
)

var ErrStaleVersion = errors.New("stale version")

func snapshotPost(ctx context.Context, tx *sql.Tx, id int64) error {
	var p model.PostInput
	if err := tx.QueryRowContext(ctx, `SELECT kind,title,slug,excerpt,content_md,cover_url,status,pinned,category_id FROM posts WHERE id=?`, id).Scan(&p.Kind, &p.Title, &p.Slug, &p.Excerpt, &p.ContentMD, &p.CoverURL, &p.Status, &p.Pinned, &p.CategoryID); err != nil {
		return err
	}
	p.TagIDs = []int64{}
	rows, err := tx.QueryContext(ctx, "SELECT tag_id FROM post_tags WHERE post_id=? ORDER BY tag_id", id)
	if err != nil {
		return err
	}
	for rows.Next() {
		var tag int64
		if err := rows.Scan(&tag); err != nil {
			rows.Close()
			return err
		}
		p.TagIDs = append(p.TagIDs, tag)
	}
	err = rows.Err()
	rows.Close()
	if err != nil {
		return err
	}
	data, err := json.Marshal(p)
	if err != nil {
		return err
	}
	var last []byte
	err = tx.QueryRowContext(ctx, "SELECT snapshot FROM post_revisions WHERE post_id=? ORDER BY id DESC LIMIT 1", id).Scan(&last)
	if err != nil && !errors.Is(err, sql.ErrNoRows) {
		return err
	}
	var prior model.PostInput
	if err == nil && json.Unmarshal(last, &prior) == nil {
		b, _ := json.Marshal(prior)
		if string(b) == string(data) {
			return nil
		}
	}
	_, err = tx.ExecContext(ctx, "INSERT INTO post_revisions(post_id,snapshot) VALUES (?,?)", id, data)
	return err
}
func (r *ContentRepository) Revisions(ctx context.Context, id int64) ([]model.Revision, error) {
	rows, err := r.db.QueryContext(ctx, "SELECT id,snapshot,created_at FROM post_revisions WHERE post_id=? ORDER BY id DESC LIMIT 100", id)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	items := []model.Revision{}
	for rows.Next() {
		var item model.Revision
		var raw []byte
		if err := rows.Scan(&item.ID, &raw, &item.CreatedAt); err != nil {
			return nil, err
		}
		if err := json.Unmarshal(raw, &item.Snapshot); err != nil {
			return nil, err
		}
		items = append(items, item)
	}
	return items, rows.Err()
}
func (r *ContentRepository) RestorePost(ctx context.Context, id int64) error {
	result, err := r.db.ExecContext(ctx, "UPDATE posts SET status='draft',version=version+1 WHERE id=? AND status='trash'", id)
	return affected(result, err)
}
func (r *ContentRepository) PurgePost(ctx context.Context, id int64) error {
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()
	result, err := tx.ExecContext(ctx, "DELETE FROM posts WHERE id=? AND status='trash'", id)
	if err := affected(result, err); err != nil {
		return err
	}
	if _, err = tx.ExecContext(ctx, "DELETE FROM writing_drafts WHERE document_key IN (?,?)", fmt.Sprintf("post-%d", id), fmt.Sprintf("note-%d", id)); err != nil {
		return err
	}
	return tx.Commit()
}

func (r *ContentRepository) Draft(ctx context.Context, user int64, key string) (model.WritingDraft, error) {
	item := model.WritingDraft{Key: key}
	var raw []byte
	err := r.db.QueryRowContext(ctx, "SELECT version,snapshot,updated_at FROM writing_drafts WHERE user_id=? AND document_key=?", user, key).Scan(&item.Version, &raw, &item.UpdatedAt)
	if errors.Is(err, sql.ErrNoRows) {
		return item, nil
	}
	if err != nil {
		return item, err
	}
	err = json.Unmarshal(raw, &item.Snapshot)
	return item, err
}
func (r *ContentRepository) SaveDraft(ctx context.Context, user int64, key string, input model.WritingDraft) (model.WritingDraft, error) {
	raw, err := json.Marshal(input.Snapshot)
	if err != nil {
		return model.WritingDraft{}, err
	}
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return model.WritingDraft{}, err
	}
	defer tx.Rollback()
	// Lock the article against concurrent purge, and never recreate drafts for deleted articles.
	parts := strings.Split(key, "-")
	if len(parts) == 2 && parts[1] != "new" {
		var status string
		err = tx.QueryRowContext(ctx, "SELECT status FROM posts WHERE id=? AND kind=? FOR SHARE", parts[1], parts[0]).Scan(&status)
		if errors.Is(err, sql.ErrNoRows) || status == "trash" {
			return model.WritingDraft{}, ErrNotFound
		}
		if err != nil {
			return model.WritingDraft{}, err
		}
	}
	if input.Version == 0 {
		if _, err = tx.ExecContext(ctx, "INSERT IGNORE INTO writing_drafts(user_id,document_key,version,snapshot) VALUES (?,?,0,?)", user, key, raw); err != nil {
			return model.WritingDraft{}, err
		}
	}
	result, err := tx.ExecContext(ctx, "UPDATE writing_drafts SET snapshot=?,version=version+1 WHERE user_id=? AND document_key=? AND version=?", raw, user, key, input.Version)
	if err != nil {
		return model.WritingDraft{}, err
	}
	n, err := result.RowsAffected()
	if err != nil {
		return model.WritingDraft{}, err
	}
	if n == 0 {
		return model.WritingDraft{}, ErrStaleVersion
	}
	item := model.WritingDraft{Key: key, Version: input.Version + 1, Snapshot: input.Snapshot}
	if err = tx.QueryRowContext(ctx, "SELECT updated_at FROM writing_drafts WHERE user_id=? AND document_key=?", user, key).Scan(&item.UpdatedAt); err != nil {
		return model.WritingDraft{}, err
	}
	if err = tx.Commit(); err != nil {
		return model.WritingDraft{}, err
	}
	return item, nil
}

func (r *ContentRepository) DeleteDraft(ctx context.Context, user int64, key string, version int64) error {
	result, err := r.db.ExecContext(ctx, "DELETE FROM writing_drafts WHERE user_id=? AND document_key=? AND version=?", user, key, version)
	if err != nil {
		return err
	}
	n, err := result.RowsAffected()
	if err != nil {
		return err
	}
	if n == 0 {
		return ErrStaleVersion
	}
	return nil
}
