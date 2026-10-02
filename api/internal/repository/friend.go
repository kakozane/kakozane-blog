package repository

import (
	"context"
	"database/sql"

	"github.com/kakozane/kakozane-blog/api/internal/model"
)

type FriendRepository struct{ db *sql.DB }

func NewFriendRepository(db *sql.DB) *FriendRepository { return &FriendRepository{db: db} }

func (r *FriendRepository) List(ctx context.Context, publicOnly bool) ([]model.FriendLink, error) {
	query := "SELECT id, kind, name, url, description, avatar_url, sort_order, visible FROM friend_links"
	if publicOnly {
		query += " WHERE visible = TRUE"
	}
	query += " ORDER BY kind, sort_order, id"
	rows, err := r.db.QueryContext(ctx, query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	items := []model.FriendLink{}
	for rows.Next() {
		var item model.FriendLink
		if err := rows.Scan(&item.ID, &item.Kind, &item.Name, &item.URL, &item.Description, &item.AvatarURL, &item.SortOrder, &item.Visible); err != nil {
			return nil, err
		}
		items = append(items, item)
	}
	return items, rows.Err()
}

func (r *FriendRepository) Get(ctx context.Context, id int64) (model.FriendLink, error) {
	var item model.FriendLink
	err := r.db.QueryRowContext(ctx, "SELECT id, kind, name, url, description, avatar_url, sort_order, visible FROM friend_links WHERE id = ?", id).
		Scan(&item.ID, &item.Kind, &item.Name, &item.URL, &item.Description, &item.AvatarURL, &item.SortOrder, &item.Visible)
	if err == sql.ErrNoRows {
		return model.FriendLink{}, ErrNotFound
	}
	return item, err
}

func (r *FriendRepository) Save(ctx context.Context, id int64, item model.FriendLink) (model.FriendLink, error) {
	if id == 0 {
		result, err := r.db.ExecContext(ctx, "INSERT INTO friend_links (kind, name, url, description, avatar_url, sort_order, visible) VALUES (?, ?, ?, ?, ?, ?, ?)",
			item.Kind, item.Name, item.URL, item.Description, item.AvatarURL, item.SortOrder, item.Visible)
		if err != nil {
			return model.FriendLink{}, err
		}
		id, err = result.LastInsertId()
		if err != nil {
			return model.FriendLink{}, err
		}
	} else {
		result, err := r.db.ExecContext(ctx, "UPDATE friend_links SET kind = ?, name = ?, url = ?, description = ?, avatar_url = ?, sort_order = ?, visible = ? WHERE id = ?",
			item.Kind, item.Name, item.URL, item.Description, item.AvatarURL, item.SortOrder, item.Visible, id)
		if err := affected(result, err); err != nil {
			return model.FriendLink{}, err
		}
	}
	return r.Get(ctx, id)
}

func (r *FriendRepository) Delete(ctx context.Context, id int64) error {
	result, err := r.db.ExecContext(ctx, "DELETE FROM friend_links WHERE id = ?", id)
	return affected(result, err)
}
