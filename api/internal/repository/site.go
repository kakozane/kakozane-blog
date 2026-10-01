package repository

import (
	"context"
	"database/sql"

	"github.com/kakozane/kakozane-blog/api/internal/model"
)

type SiteRepository struct{ db *sql.DB }

func NewSiteRepository(db *sql.DB) *SiteRepository { return &SiteRepository{db: db} }

func (r *SiteRepository) Get(ctx context.Context) (model.Site, error) {
	var item model.Site
	err := r.db.QueryRowContext(ctx, "SELECT title, tagline, description, about_md, site_url, github_url FROM site_settings WHERE id = 1").
		Scan(&item.Title, &item.Tagline, &item.Description, &item.AboutMD, &item.SiteURL, &item.GitHubURL)
	return item, err
}

func (r *SiteRepository) Update(ctx context.Context, item model.Site) (model.Site, error) {
	_, err := r.db.ExecContext(ctx, "UPDATE site_settings SET title = ?, tagline = ?, description = ?, about_md = ?, site_url = ?, github_url = ? WHERE id = 1",
		item.Title, item.Tagline, item.Description, item.AboutMD, item.SiteURL, item.GitHubURL)
	if err != nil {
		return model.Site{}, err
	}
	return r.Get(ctx)
}
