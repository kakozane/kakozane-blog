package model

import "time"

type FeedPost struct {
	Kind        string
	Slug        string
	Title       string
	Excerpt     string
	PublishedAt time.Time
	UpdatedAt   time.Time
}
