package model

type FriendLink struct {
	ID          int64  `json:"id"`
	Kind        string `json:"kind"`
	Name        string `json:"name"`
	URL         string `json:"url"`
	Description string `json:"description"`
	AvatarURL   string `json:"avatarUrl"`
	SortOrder   int    `json:"sortOrder"`
	Visible     bool   `json:"visible"`
}
