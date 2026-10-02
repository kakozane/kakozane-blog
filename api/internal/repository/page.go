package repository

import (
	"context"
	"database/sql"
	"errors"

	"github.com/kakozane/kakozane-blog/api/internal/model"
)

type PageRepository struct{ db *sql.DB }

func NewPageRepository(db *sql.DB) *PageRepository { return &PageRepository{db: db} }

func (r *PageRepository) List(ctx context.Context, publicOnly bool) ([]model.Page, error) {
	query := "SELECT id, title, slug, description, status, published_at, created_at, updated_at FROM pages"
	if publicOnly {
		query += " WHERE status = 'published' ORDER BY published_at DESC, id DESC"
	} else {
		query += " ORDER BY updated_at DESC, id DESC"
	}
	return r.list(ctx, query)
}

func (r *PageRepository) Search(ctx context.Context, keyword string) ([]model.Page, error) {
	// ponytail: fixed pages are few; add an index and pagination if their count grows.
	query := `SELECT id, title, slug, description, status, published_at, created_at, updated_at FROM pages
		WHERE status = 'published' AND (title LIKE ? ESCAPE '!' OR description LIKE ? ESCAPE '!' OR content_md LIKE ? ESCAPE '!')
		ORDER BY published_at DESC, id DESC`
	pattern := likePattern(keyword)
	return r.list(ctx, query, pattern, pattern, pattern)
}

func (r *PageRepository) list(ctx context.Context, query string, args ...any) ([]model.Page, error) {
	rows, err := r.db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	items := []model.Page{}
	for rows.Next() {
		item, err := scanPage(rows.Scan, false)
		if err != nil {
			return nil, err
		}
		items = append(items, item)
	}
	return items, rows.Err()
}

func (r *PageRepository) Get(ctx context.Context, id int64) (model.Page, error) {
	return r.page(ctx, "id = ?", id)
}

func (r *PageRepository) PublishedBySlug(ctx context.Context, slug string) (model.Page, error) {
	return r.page(ctx, "slug = ? AND status = 'published'", slug)
}

func (r *PageRepository) page(ctx context.Context, condition string, value any) (model.Page, error) {
	query := "SELECT id, title, slug, description, content_md, status, published_at, created_at, updated_at FROM pages WHERE " + condition
	item, err := scanPage(r.db.QueryRowContext(ctx, query, value).Scan, true)
	if errors.Is(err, sql.ErrNoRows) {
		return model.Page{}, ErrNotFound
	}
	return item, err
}

func scanPage(scan func(...any) error, withContent bool) (model.Page, error) {
	var item model.Page
	var publishedAt sql.NullTime
	fields := []any{&item.ID, &item.Title, &item.Slug, &item.Description}
	if withContent {
		fields = append(fields, &item.ContentMD)
	}
	fields = append(fields, &item.Status, &publishedAt, &item.CreatedAt, &item.UpdatedAt)
	if err := scan(fields...); err != nil {
		return model.Page{}, err
	}
	if publishedAt.Valid {
		item.PublishedAt = &publishedAt.Time
	}
	return item, nil
}

func (r *PageRepository) Save(ctx context.Context, id int64, item model.Page) (model.Page, error) {
	if id == 0 {
		result, err := r.db.ExecContext(ctx, `INSERT INTO pages (title, slug, description, content_md, status, published_at)
			VALUES (?, ?, ?, ?, ?, CASE WHEN ? = 'published' THEN CURRENT_TIMESTAMP ELSE NULL END)`,
			item.Title, item.Slug, item.Description, item.ContentMD, item.Status, item.Status)
		if err != nil {
			return model.Page{}, err
		}
		id, err = result.LastInsertId()
		if err != nil {
			return model.Page{}, err
		}
	} else {
		_, err := r.db.ExecContext(ctx, `UPDATE pages SET title = ?, slug = ?, description = ?, content_md = ?, status = ?,
			published_at = CASE WHEN ? = 'published' THEN COALESCE(published_at, CURRENT_TIMESTAMP) ELSE NULL END WHERE id = ?`,
			item.Title, item.Slug, item.Description, item.ContentMD, item.Status, item.Status, id)
		if err != nil {
			return model.Page{}, err
		}
	}
	return r.Get(ctx, id)
}

func (r *PageRepository) Delete(ctx context.Context, id int64) error {
	result, err := r.db.ExecContext(ctx, "DELETE FROM pages WHERE id = ?", id)
	return affected(result, err)
}
