package model

import "time"

type FeedPost struct {
	Slug        string
	Title       string
	Excerpt     string
	PublishedAt time.Time
	UpdatedAt   time.Time
}
