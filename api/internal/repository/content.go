package repository

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/kakozane/kakozane-blog/api/internal/model"
)

var ErrNotFound = errors.New("not found")

type ContentRepository struct{ db *sql.DB }

func NewContentRepository(db *sql.DB) *ContentRepository { return &ContentRepository{db: db} }

func (r *ContentRepository) PublicationStats(ctx context.Context) (model.PublicationStats, error) {
	var stats model.PublicationStats
	var first sql.NullTime
	err := r.db.QueryRowContext(ctx, `SELECT
		COALESCE(SUM(kind = 'post'), 0),
		COALESCE(SUM(kind = 'note'), 0),
		COALESCE(SUM(kind = 'thought'), 0),
		MIN(published_at)
		FROM posts WHERE status = 'published'`).Scan(&stats.Posts, &stats.Notes, &stats.Thoughts, &first)
	if first.Valid {
		stats.FirstPublishedAt = &first.Time
	}
	return stats, err
}

func (r *ContentRepository) ListTerms(ctx context.Context, kind string, publicOnly bool) ([]model.Term, error) {
	table, err := termTable(kind)
	if err != nil {
		return nil, err
	}
	query := "SELECT t.id, t.name, t.slug FROM " + table + " t"
	if publicOnly {
		if kind == "categories" {
			query += " WHERE EXISTS (SELECT 1 FROM posts p WHERE p.category_id = t.id AND p.status = 'published')"
		} else {
			query += " WHERE EXISTS (SELECT 1 FROM post_tags pt JOIN posts p ON p.id = pt.post_id WHERE pt.tag_id = t.id AND p.status = 'published')"
		}
	}
	rows, err := r.db.QueryContext(ctx, query+" ORDER BY t.name, t.id")
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

func (r *ContentRepository) ListNoteSeries(ctx context.Context) ([]model.NoteSeries, error) {
	rows, err := r.db.QueryContext(ctx, `SELECT c.id, c.name, c.slug, COUNT(*)
		FROM categories c JOIN posts p ON p.category_id = c.id
		WHERE p.kind = 'note' AND p.status = 'published'
		GROUP BY c.id, c.name, c.slug ORDER BY MAX(p.published_at) DESC, c.id DESC`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	items := []model.NoteSeries{}
	for rows.Next() {
		var item model.NoteSeries
		if err := rows.Scan(&item.ID, &item.Name, &item.Slug, &item.Count); err != nil {
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
	if filter.Kind != "all" {
		where = append(where, "p.kind = ?")
		args = append(args, filter.Kind)
	}
	if filter.FeaturedOnly {
		where = append(where, "p.pinned = TRUE")
	}
	if filter.Query != "" {
		where = append(where, "(p.title LIKE ? ESCAPE '!' OR p.excerpt LIKE ? ESCAPE '!' OR p.content_md LIKE ? ESCAPE '!')")
		query := likePattern(filter.Query)
		// ponytail: LIKE scans content; add full-text indexing if search traffic or post volume grows.
		args = append(args, query, query, query)
	}
	if filter.CategorySlug != "" {
		where = append(where, "c.slug = ?")
		args = append(args, filter.CategorySlug)
	}
	if filter.TagSlug != "" {
		where = append(where, "EXISTS (SELECT 1 FROM post_tags pt JOIN tags t ON t.id = pt.tag_id WHERE pt.post_id = p.id AND t.slug = ?)")
		args = append(args, filter.TagSlug)
	}
	if filter.Year != 0 {
		where = append(where, "YEAR(p.published_at) = ?")
		args = append(args, filter.Year)
	}
	if filter.Month != "" {
		month, _ := time.Parse("2006-01", filter.Month) // 由 service 校验。
		where = append(where, "p.published_at >= ? AND p.published_at < ?")
		args = append(args, month, month.AddDate(0, 1, 0))
	}
	from := " FROM posts p JOIN users u ON u.id = p.author_id LEFT JOIN categories c ON c.id = p.category_id WHERE " + strings.Join(where, " AND ")
	var total int64
	if err := r.db.QueryRowContext(ctx, "SELECT COUNT(*)"+from, args...).Scan(&total); err != nil {
		return nil, 0, err
	}
	order := postOrder(filter)
	withContent := filter.Kind == "thought"
	columns := "p.id, p.author_id, u.display_name, p.category_id, c.name, c.slug, p.kind, p.title, p.slug, p.excerpt"
	if withContent {
		columns += ", p.content_md"
	}
	query := "SELECT " + columns + ", p.cover_url, p.status, p.pinned, p.published_at, p.created_at, p.updated_at" + from + " ORDER BY " + order + " LIMIT ? OFFSET ?"
	rows, err := r.db.QueryContext(ctx, query, append(args, filter.PageSize, (filter.Page-1)*filter.PageSize)...)
	if err != nil {
		return nil, 0, err
	}
	items := []model.Post{}
	for rows.Next() {
		item, err := scanPost(rows.Scan, withContent)
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

func postOrder(filter model.PostFilter) string {
	order := "p.updated_at DESC, p.id DESC"
	if filter.PublishedOnly {
		switch filter.Sort {
		case "oldest":
			order = "p.published_at ASC, p.id ASC"
		case "updated":
			order = "p.updated_at DESC, p.id DESC"
		default:
			order = "p.published_at DESC, p.id DESC"
		}
	}
	if filter.PinnedFirst {
		order = "p.pinned DESC, " + order
	}
	return order
}

func likePattern(value string) string {
	return "%" + strings.NewReplacer("!", "!!", "%", "!%", "_", "!_").Replace(value) + "%"
}

func (r *ContentRepository) PublicYears(ctx context.Context, featured bool) ([]int, error) {
	query := "SELECT DISTINCT YEAR(published_at) FROM posts WHERE status = 'published' AND published_at IS NOT NULL"
	if featured {
		query += " AND kind = 'note' AND pinned = TRUE"
	}
	rows, err := r.db.QueryContext(ctx, query+" ORDER BY YEAR(published_at) DESC")
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	years := []int{}
	for rows.Next() {
		var year int
		if err := rows.Scan(&year); err != nil {
			return nil, err
		}
		years = append(years, year)
	}
	return years, rows.Err()
}

func (r *ContentRepository) PublishedMonthCounts(ctx context.Context, start, end time.Time) (map[string]int64, error) {
	rows, err := r.db.QueryContext(ctx, `SELECT DATE_FORMAT(published_at, '%Y-%m'), COUNT(*) FROM posts
		WHERE status = 'published' AND published_at >= ? AND published_at < ?
		GROUP BY DATE_FORMAT(published_at, '%Y-%m')`, start, end)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	counts := map[string]int64{}
	for rows.Next() {
		var month string
		var count int64
		if err := rows.Scan(&month, &count); err != nil {
			return nil, err
		}
		counts[month] = count
	}
	return counts, rows.Err()
}

func (r *ContentRepository) PostByID(ctx context.Context, id int64) (model.Post, error) {
	return r.post(ctx, "p.id = ?", id)
}

func (r *ContentRepository) PublishedPostBySlug(ctx context.Context, slug string) (model.Post, error) {
	return r.post(ctx, "p.slug = ? AND p.status = 'published'", slug)
}

func (r *ContentRepository) RelatedPosts(ctx context.Context, post model.Post) ([]model.Post, error) {
	// ponytail: 在读取时计算共同标签；文章规模使查询变慢时再加缓存或预计算。
	// 先按共同标签数、同分类排序；不足三篇时自动用同类型的新内容补齐。
	query := `SELECT p.id, p.author_id, u.display_name, p.category_id, c.name, c.slug, p.kind, p.title, p.slug, p.excerpt, p.cover_url, p.status, p.pinned, p.published_at, p.created_at, p.updated_at
		FROM posts p JOIN users u ON u.id = p.author_id LEFT JOIN categories c ON c.id = p.category_id
		WHERE p.status = 'published' AND p.kind = ? AND p.id <> ?
		ORDER BY (SELECT COUNT(*) FROM post_tags candidate JOIN post_tags current ON current.tag_id = candidate.tag_id AND current.post_id = ? WHERE candidate.post_id = p.id) DESC,
		CASE WHEN ? IS NOT NULL AND p.category_id = ? THEN 1 ELSE 0 END DESC,
		p.published_at DESC, p.id DESC LIMIT 3`
	rows, err := r.db.QueryContext(ctx, query, post.Kind, post.ID, post.ID, post.CategoryID, post.CategoryID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	items := []model.Post{}
	for rows.Next() {
		item, err := scanPost(rows.Scan, false)
		if err != nil {
			return nil, err
		}
		items = append(items, item)
	}
	return items, rows.Err()
}

func (r *ContentRepository) AdjacentPosts(ctx context.Context, post model.Post) (*model.PostLink, *model.PostLink, error) {
	if post.PublishedAt == nil {
		return nil, nil, nil
	}
	find := func(compare, direction string) (*model.PostLink, error) {
		query := `SELECT id, title, slug FROM posts WHERE kind = ? AND status = 'published'
			AND (published_at ` + compare + ` ? OR (published_at = ? AND id ` + compare + ` ?))
			ORDER BY published_at ` + direction + `, id ` + direction + ` LIMIT 1`
		var item model.PostLink
		err := r.db.QueryRowContext(ctx, query, post.Kind, *post.PublishedAt, *post.PublishedAt, post.ID).Scan(&item.ID, &item.Title, &item.Slug)
		if errors.Is(err, sql.ErrNoRows) {
			return nil, nil
		}
		if err != nil {
			return nil, err
		}
		return &item, nil
	}
	previous, err := find("<", "DESC")
	if err != nil {
		return nil, nil, err
	}
	next, err := find(">", "ASC")
	return previous, next, err
}

func (r *ContentRepository) post(ctx context.Context, condition string, value any) (model.Post, error) {
	query := "SELECT p.id, p.author_id, u.display_name, p.category_id, c.name, c.slug, p.kind, p.title, p.slug, p.excerpt, p.content_md, p.cover_url, p.status, p.pinned, p.published_at, p.created_at, p.updated_at FROM posts p JOIN users u ON u.id = p.author_id LEFT JOIN categories c ON c.id = p.category_id WHERE " + condition
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
	fields := []any{&item.ID, &item.AuthorID, &item.AuthorName, &categoryID, &categoryName, &categorySlug, &item.Kind, &item.Title, &item.Slug, &item.Excerpt}
	if withContent {
		fields = append(fields, &item.ContentMD)
	}
	fields = append(fields, &item.CoverURL, &item.Status, &item.Pinned, &publishedAt, &item.CreatedAt, &item.UpdatedAt)
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
		result, err := tx.ExecContext(ctx, `INSERT INTO posts (author_id, category_id, kind, title, slug, excerpt, content_md, cover_url, status, pinned, published_at)
			VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CASE WHEN ? = 'published' THEN CURRENT_TIMESTAMP ELSE NULL END)`,
			authorID, input.CategoryID, input.Kind, input.Title, input.Slug, input.Excerpt, input.ContentMD, input.CoverURL, input.Status, input.Pinned, input.Status)
		if err != nil {
			return 0, err
		}
		id, err = result.LastInsertId()
		if err != nil {
			return 0, err
		}
	} else {
		result, err := tx.ExecContext(ctx, `UPDATE posts SET category_id = ?, kind = ?, title = ?, slug = ?, excerpt = ?, content_md = ?, cover_url = ?, status = ?, pinned = ?,
			published_at = CASE WHEN ? = 'published' THEN COALESCE(published_at, CURRENT_TIMESTAMP) ELSE published_at END WHERE id = ?`,
			input.CategoryID, input.Kind, input.Title, input.Slug, input.Excerpt, input.ContentMD, input.CoverURL, input.Status, input.Pinned, input.Status, id)
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

func (r *ContentRepository) PublishedForFeed(ctx context.Context, limit int, kind string) ([]model.FeedPost, error) {
	query := "SELECT kind, slug, title, excerpt, COALESCE(published_at, created_at), updated_at FROM posts WHERE status = 'published'"
	args := []any{}
	if kind != "" {
		query += " AND kind = ?"
		args = append(args, kind)
	}
	query += " ORDER BY published_at DESC, id DESC"
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
		if err := rows.Scan(&item.Kind, &item.Slug, &item.Title, &item.Excerpt, &item.PublishedAt, &item.UpdatedAt); err != nil {
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
