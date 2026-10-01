package model

type Site struct {
	Title       string `json:"title"`
	Tagline     string `json:"tagline"`
	Description string `json:"description"`
	AboutMD     string `json:"aboutMd"`
	SiteURL     string `json:"siteUrl"`
	GitHubURL   string `json:"githubUrl"`
}
