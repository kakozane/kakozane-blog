package repository

import (
	"context"
	"database/sql"

	"github.com/kakozane/kakozane-blog/api/internal/model"
)

type SayRepository struct{ db *sql.DB }

func NewSayRepository(db *sql.DB) *SayRepository { return &SayRepository{db: db} }

func (r *SayRepository) List(ctx context.Context, publicOnly bool, page, pageSize int) ([]model.Say, int64, error) {
	where := ""
	if publicOnly {
		where = " WHERE visible = TRUE"
	}
	var total int64
	if err := r.db.QueryRowContext(ctx, "SELECT COUNT(*) FROM says"+where).Scan(&total); err != nil {
		return nil, 0, err
	}
	rows, err := r.db.QueryContext(ctx, "SELECT id, text, source, author, visible, created_at, updated_at FROM says"+where+" ORDER BY created_at DESC, id DESC LIMIT ? OFFSET ?", pageSize, (page-1)*pageSize)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()
	items := []model.Say{}
	for rows.Next() {
		var item model.Say
		if err := rows.Scan(&item.ID, &item.Text, &item.Source, &item.Author, &item.Visible, &item.CreatedAt, &item.UpdatedAt); err != nil {
			return nil, 0, err
		}
		items = append(items, item)
	}
	return items, total, rows.Err()
}

func (r *SayRepository) Get(ctx context.Context, id int64) (model.Say, error) {
	var item model.Say
	err := r.db.QueryRowContext(ctx, "SELECT id, text, source, author, visible, created_at, updated_at FROM says WHERE id = ?", id).
		Scan(&item.ID, &item.Text, &item.Source, &item.Author, &item.Visible, &item.CreatedAt, &item.UpdatedAt)
	if err == sql.ErrNoRows {
		return model.Say{}, ErrNotFound
	}
	return item, err
}

func (r *SayRepository) Save(ctx context.Context, id int64, item model.Say) (model.Say, error) {
	if id == 0 {
		result, err := r.db.ExecContext(ctx, "INSERT INTO says (text, source, author, visible) VALUES (?, ?, ?, ?)", item.Text, item.Source, item.Author, item.Visible)
		if err != nil {
			return model.Say{}, err
		}
		id, err = result.LastInsertId()
		if err != nil {
			return model.Say{}, err
		}
	} else {
		result, err := r.db.ExecContext(ctx, "UPDATE says SET text = ?, source = ?, author = ?, visible = ? WHERE id = ?", item.Text, item.Source, item.Author, item.Visible, id)
		if err := affected(result, err); err != nil {
			return model.Say{}, err
		}
	}
	return r.Get(ctx, id)
}

func (r *SayRepository) Delete(ctx context.Context, id int64) error {
	result, err := r.db.ExecContext(ctx, "DELETE FROM says WHERE id = ?", id)
	return affected(result, err)
}
