package repository

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"strings"

	"github.com/kakozane/kakozane-blog/api/internal/model"
)

var ErrNotFound = errors.New("not found")

type ContentRepository struct{ db *sql.DB }

func NewContentRepository(db *sql.DB) *ContentRepository { return &ContentRepository{db: db} }

func (r *ContentRepository) ListTerms(ctx context.Context, kind string) ([]model.Term, error) {
	table, err := termTable(kind)
	if err != nil {
		return nil, err
	}
	rows, err := r.db.QueryContext(ctx, "SELECT id, name, slug FROM "+table+" ORDER BY name, id")
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	items := []model.Term{}
	for rows.Next() {
		var item model.Term
		if err := rows.Scan(&item.ID, &item.Name, &item.Slug); err != nil {
			return nil, err
		}
		items = append(items, item)
	}
	return items, rows.Err()
}

func (r *ContentRepository) SaveTerm(ctx context.Context, kind string, id int64, item model.Term) (int64, error) {
	table, err := termTable(kind)
	if err != nil {
		return 0, err
	}
	if id == 0 {
		result, err := r.db.ExecContext(ctx, "INSERT INTO "+table+" (name, slug) VALUES (?, ?)", item.Name, item.Slug)
		if err != nil {
			return 0, err
		}
		return result.LastInsertId()
	}
	result, err := r.db.ExecContext(ctx, "UPDATE "+table+" SET name = ?, slug = ? WHERE id = ?", item.Name, item.Slug, id)
	if err != nil {
		return 0, err
	}
	changed, err := result.RowsAffected()
	if err != nil {
		return 0, err
	}
	if changed == 0 {
		return 0, ErrNotFound
	}
	return id, nil
}

func (r *ContentRepository) DeleteTerm(ctx context.Context, kind string, id int64) error {
	table, err := termTable(kind)
	if err != nil {
		return err
	}
	result, err := r.db.ExecContext(ctx, "DELETE FROM "+table+" WHERE id = ?", id)
	return affected(result, err)
}

func termTable(kind string) (string, error) {
	switch kind {
	case "categories", "tags":
		return kind, nil
	default:
		return "", fmt.Errorf("invalid term kind: %s", kind)
	}
}

func (r *ContentRepository) ListPosts(ctx context.Context, filter model.PostFilter) ([]model.Post, int64, error) {
	where := []string{"1 = 1"}
	args := []any{}
	if filter.PublishedOnly {
		where = append(where, "p.status = 'published'")
	} else if filter.Status != "" {
		where = append(where, "p.status = ?")
		args = append(args, filter.Status)
	}
	if filter.Query != "" {
		where = append(where, "(p.title LIKE ? OR p.excerpt LIKE ?)")
		query := "%" + filter.Query + "%"
		args = append(args, query, query)
	}
	if filter.CategorySlug != "" {
		where = append(where, "c.slug = ?")
		args = append(args, filter.CategorySlug)
	}
	if filter.TagSlug != "" {
		where = append(where, "EXISTS (SELECT 1 FROM post_tags pt JOIN tags t ON t.id = pt.tag_id WHERE pt.post_id = p.id AND t.slug = ?)")
		args = append(args, filter.TagSlug)
	}
	from := " FROM posts p JOIN users u ON u.id = p.author_id LEFT JOIN categories c ON c.id = p.category_id WHERE " + strings.Join(where, " AND ")
	var total int64
	if err := r.db.QueryRowContext(ctx, "SELECT COUNT(*)"+from, args...).Scan(&total); err != nil {
		return nil, 0, err
	}
	order := "p.updated_at DESC, p.id DESC"
	if filter.PublishedOnly {
		order = "p.published_at DESC, p.id DESC"
	}
	query := "SELECT p.id, p.author_id, u.display_name, p.category_id, c.name, c.slug, p.title, p.slug, p.excerpt, p.cover_url, p.status, p.published_at, p.created_at, p.updated_at" + from + " ORDER BY " + order + " LIMIT ? OFFSET ?"
	rows, err := r.db.QueryContext(ctx, query, append(args, filter.PageSize, (filter.Page-1)*filter.PageSize)...)
	if err != nil {
		return nil, 0, err
	}
	items := []model.Post{}
	for rows.Next() {
		item, err := scanPost(rows.Scan, false)
		if err != nil {
			rows.Close()
			return nil, 0, err
		}
		items = append(items, item)
	}
	if err := rows.Err(); err != nil {
		rows.Close()
		return nil, 0, err
	}
	if err := rows.Close(); err != nil {
		return nil, 0, err
	}
	if err := r.loadTags(ctx, items); err != nil {
		return nil, 0, err
	}
	return items, total, nil
}

func (r *ContentRepository) PostByID(ctx context.Context, id int64) (model.Post, error) {
	return r.post(ctx, "p.id = ?", id)
}

func (r *ContentRepository) PublishedPostBySlug(ctx context.Context, slug string) (model.Post, error) {
	return r.post(ctx, "p.slug = ? AND p.status = 'published'", slug)
}

func (r *ContentRepository) post(ctx context.Context, condition string, value any) (model.Post, error) {
	query := "SELECT p.id, p.author_id, u.display_name, p.category_id, c.name, c.slug, p.title, p.slug, p.excerpt, p.content_md, p.cover_url, p.status, p.published_at, p.created_at, p.updated_at FROM posts p JOIN users u ON u.id = p.author_id LEFT JOIN categories c ON c.id = p.category_id WHERE " + condition
	item, err := scanPost(r.db.QueryRowContext(ctx, query, value).Scan, true)
	if errors.Is(err, sql.ErrNoRows) {
		return model.Post{}, ErrNotFound
	}
	if err != nil {
		return model.Post{}, err
	}
	items := []model.Post{item}
	if err := r.loadTags(ctx, items); err != nil {
		return model.Post{}, err
	}
	return items[0], nil
}

func scanPost(scan func(...any) error, withContent bool) (model.Post, error) {
	item := model.Post{Tags: []model.Term{}}
	var categoryID sql.NullInt64
	var categoryName, categorySlug sql.NullString
	var publishedAt sql.NullTime
	fields := []any{&item.ID, &item.AuthorID, &item.AuthorName, &categoryID, &categoryName, &categorySlug, &item.Title, &item.Slug, &item.Excerpt}
	if withContent {
		fields = append(fields, &item.ContentMD)
	}
	fields = append(fields, &item.CoverURL, &item.Status, &publishedAt, &item.CreatedAt, &item.UpdatedAt)
	if err := scan(fields...); err != nil {
		return model.Post{}, err
	}
	if categoryID.Valid {
		item.CategoryID = &categoryID.Int64
		item.CategoryName = categoryName.String
		item.CategorySlug = categorySlug.String
	}
	if publishedAt.Valid {
		item.PublishedAt = &publishedAt.Time
	}
	return item, nil
}

func (r *ContentRepository) loadTags(ctx context.Context, posts []model.Post) error {
	if len(posts) == 0 {
		return nil
	}
	placeholders := make([]string, len(posts))
	args := make([]any, len(posts))
	index := make(map[int64]int, len(posts))
	for i, post := range posts {
		placeholders[i] = "?"
		args[i] = post.ID
		index[post.ID] = i
	}
	query := "SELECT pt.post_id, t.id, t.name, t.slug FROM post_tags pt JOIN tags t ON t.id = pt.tag_id WHERE pt.post_id IN (" + strings.Join(placeholders, ",") + ") ORDER BY t.name, t.id"
	rows, err := r.db.QueryContext(ctx, query, args...)
	if err != nil {
		return err
	}
	defer rows.Close()
	for rows.Next() {
		var postID int64
		var tag model.Term
		if err := rows.Scan(&postID, &tag.ID, &tag.Name, &tag.Slug); err != nil {
			return err
		}
		posts[index[postID]].Tags = append(posts[index[postID]].Tags, tag)
	}
	return rows.Err()
}

func (r *ContentRepository) SavePost(ctx context.Context, id, authorID int64, input model.PostInput) (int64, error) {
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return 0, err
	}
	defer tx.Rollback()
	if id == 0 {
		result, err := tx.ExecContext(ctx, `INSERT INTO posts (author_id, category_id, title, slug, excerpt, content_md, cover_url, status, published_at)
			VALUES (?, ?, ?, ?, ?, ?, ?, ?, CASE WHEN ? = 'published' THEN CURRENT_TIMESTAMP ELSE NULL END)`,
			authorID, input.CategoryID, input.Title, input.Slug, input.Excerpt, input.ContentMD, input.CoverURL, input.Status, input.Status)
		if err != nil {
			return 0, err
		}
		id, err = result.LastInsertId()
		if err != nil {
			return 0, err
		}
	} else {
		result, err := tx.ExecContext(ctx, `UPDATE posts SET category_id = ?, title = ?, slug = ?, excerpt = ?, content_md = ?, cover_url = ?, status = ?,
			published_at = CASE WHEN ? = 'published' THEN COALESCE(published_at, CURRENT_TIMESTAMP) ELSE published_at END WHERE id = ?`,
			input.CategoryID, input.Title, input.Slug, input.Excerpt, input.ContentMD, input.CoverURL, input.Status, input.Status, id)
		if err := affected(result, err); err != nil {
			return 0, err
		}
		if _, err := tx.ExecContext(ctx, "DELETE FROM post_tags WHERE post_id = ?", id); err != nil {
			return 0, err
		}
	}
	for _, tagID := range input.TagIDs {
		if _, err := tx.ExecContext(ctx, "INSERT INTO post_tags (post_id, tag_id) VALUES (?, ?)", id, tagID); err != nil {
			return 0, err
		}
	}
	if err := tx.Commit(); err != nil {
		return 0, err
	}
	return id, nil
}

func (r *ContentRepository) DeletePost(ctx context.Context, id int64) error {
	result, err := r.db.ExecContext(ctx, "DELETE FROM posts WHERE id = ?", id)
	return affected(result, err)
}

func (r *ContentRepository) PublishedForFeed(ctx context.Context, limit int) ([]model.FeedPost, error) {
	query := "SELECT slug, title, excerpt, COALESCE(published_at, created_at), updated_at FROM posts WHERE status = 'published' ORDER BY published_at DESC, id DESC"
	args := []any{}
	if limit > 0 {
		query += " LIMIT ?"
		args = append(args, limit)
	}
	rows, err := r.db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	items := []model.FeedPost{}
	for rows.Next() {
		var item model.FeedPost
		if err := rows.Scan(&item.Slug, &item.Title, &item.Excerpt, &item.PublishedAt, &item.UpdatedAt); err != nil {
			return nil, err
		}
		items = append(items, item)
	}
	return items, rows.Err()
}

func affected(result sql.Result, err error) error {
	if err != nil {
		return err
	}
	count, err := result.RowsAffected()
	if err != nil {
		return err
	}
	if count == 0 {
		return ErrNotFound
	}
	return nil
}
