package model

import "time"

type Site struct {
	Title       string     `json:"title"`
	Tagline     string     `json:"tagline"`
	Description string     `json:"description"`
	AboutMD     string     `json:"aboutMd"`
	SiteURL     string     `json:"siteUrl"`
	GitHubURL   string     `json:"githubUrl"`
	NavLinks    []NavLink  `json:"navLinks"`
	AvatarURL   string     `json:"avatarUrl"`
	FaviconURL  string     `json:"faviconUrl"`
	StatusEmoji string     `json:"statusEmoji"`
	StatusText  string     `json:"statusText"`
	StatusUntil *time.Time `json:"statusUntil"`
}

type NavLink struct {
	Label string `json:"label"`
	Href  string `json:"href"`
}
