package repository

import (
	"context"
	"database/sql"
	"encoding/json"

	"github.com/kakozane/kakozane-blog/api/internal/model"
)

type SiteRepository struct{ db *sql.DB }

func NewSiteRepository(db *sql.DB) *SiteRepository { return &SiteRepository{db: db} }

func (r *SiteRepository) Get(ctx context.Context) (model.Site, error) {
	var item model.Site
	var navLinks []byte
	err := r.db.QueryRowContext(ctx, "SELECT title, tagline, description, about_md, site_url, github_url, nav_links, avatar_url, favicon_url, status_emoji, status_text, status_until FROM site_settings WHERE id = 1").
		Scan(&item.Title, &item.Tagline, &item.Description, &item.AboutMD, &item.SiteURL, &item.GitHubURL, &navLinks, &item.AvatarURL, &item.FaviconURL, &item.StatusEmoji, &item.StatusText, &item.StatusUntil)
	if err != nil {
		return model.Site{}, err
	}
	item.NavLinks = []model.NavLink{}
	if len(navLinks) > 0 {
		if err := json.Unmarshal(navLinks, &item.NavLinks); err != nil {
			return model.Site{}, err
		}
	}
	return item, nil
}

func (r *SiteRepository) Update(ctx context.Context, item model.Site) (model.Site, error) {
	navLinks, err := json.Marshal(item.NavLinks)
	if err != nil {
		return model.Site{}, err
	}
	_, err = r.db.ExecContext(ctx, "UPDATE site_settings SET title = ?, tagline = ?, description = ?, about_md = ?, site_url = ?, github_url = ?, nav_links = ?, avatar_url = ?, favicon_url = ?, status_emoji = ?, status_text = ?, status_until = ? WHERE id = 1",
		item.Title, item.Tagline, item.Description, item.AboutMD, item.SiteURL, item.GitHubURL, string(navLinks), item.AvatarURL, item.FaviconURL, item.StatusEmoji, item.StatusText, item.StatusUntil)
	if err != nil {
		return model.Site{}, err
	}
	return r.Get(ctx)
}
