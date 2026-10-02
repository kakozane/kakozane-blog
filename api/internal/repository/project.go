package repository

import (
	"context"
	"database/sql"

	"github.com/kakozane/kakozane-blog/api/internal/model"
)

type ProjectRepository struct{ db *sql.DB }

func NewProjectRepository(db *sql.DB) *ProjectRepository { return &ProjectRepository{db: db} }

func (r *ProjectRepository) List(ctx context.Context, publicOnly bool) ([]model.Project, error) {
	query := "SELECT id, name, url, description, avatar_url, sort_order, visible FROM projects"
	if publicOnly {
		query += " WHERE visible = TRUE"
	}
	query += " ORDER BY sort_order, id"
	rows, err := r.db.QueryContext(ctx, query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	items := []model.Project{}
	for rows.Next() {
		var item model.Project
		if err := rows.Scan(&item.ID, &item.Name, &item.URL, &item.Description, &item.AvatarURL, &item.SortOrder, &item.Visible); err != nil {
			return nil, err
		}
		items = append(items, item)
	}
	return items, rows.Err()
}

func (r *ProjectRepository) Get(ctx context.Context, id int64) (model.Project, error) {
	var item model.Project
	err := r.db.QueryRowContext(ctx, "SELECT id, name, url, description, avatar_url, sort_order, visible FROM projects WHERE id = ?", id).
		Scan(&item.ID, &item.Name, &item.URL, &item.Description, &item.AvatarURL, &item.SortOrder, &item.Visible)
	if err == sql.ErrNoRows {
		return model.Project{}, ErrNotFound
	}
	return item, err
}

func (r *ProjectRepository) Save(ctx context.Context, id int64, item model.Project) (model.Project, error) {
	if id == 0 {
		result, err := r.db.ExecContext(ctx, "INSERT INTO projects (name, url, description, avatar_url, sort_order, visible) VALUES (?, ?, ?, ?, ?, ?)",
			item.Name, item.URL, item.Description, item.AvatarURL, item.SortOrder, item.Visible)
		if err != nil {
			return model.Project{}, err
		}
		id, err = result.LastInsertId()
		if err != nil {
			return model.Project{}, err
		}
	} else {
		result, err := r.db.ExecContext(ctx, "UPDATE projects SET name = ?, url = ?, description = ?, avatar_url = ?, sort_order = ?, visible = ? WHERE id = ?",
			item.Name, item.URL, item.Description, item.AvatarURL, item.SortOrder, item.Visible, id)
		if err := affected(result, err); err != nil {
			return model.Project{}, err
		}
	}
	return r.Get(ctx, id)
}

func (r *ProjectRepository) Delete(ctx context.Context, id int64) error {
	result, err := r.db.ExecContext(ctx, "DELETE FROM projects WHERE id = ?", id)
	return affected(result, err)
}
