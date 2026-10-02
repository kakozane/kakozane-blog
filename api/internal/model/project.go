package model

type Project struct {
	ID          int64  `json:"id"`
	Name        string `json:"name"`
	URL         string `json:"url"`
	Description string `json:"description"`
	AvatarURL   string `json:"avatarUrl"`
	SortOrder   int    `json:"sortOrder"`
	Visible     bool   `json:"visible"`
}
