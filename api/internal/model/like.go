package model

import "time"

type LikeState struct {
	Count int64 `json:"count"`
	Liked bool  `json:"liked"`
}

type RecentLike struct {
	Kind      string    `json:"kind"`
	Slug      string    `json:"slug"`
	Title     string    `json:"title"`
	CreatedAt time.Time `json:"createdAt"`
}

type LikedPost struct {
	Kind    string    `json:"kind"`
	Slug    string    `json:"slug"`
	Title   string    `json:"title"`
	LikedAt time.Time `json:"likedAt"`
}
