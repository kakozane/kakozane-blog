package model

import "time"

type Term struct {
	ID   int64  `json:"id"`
	Name string `json:"name"`
	Slug string `json:"slug"`
}

type Post struct {
	ID           int64      `json:"id"`
	AuthorID     int64      `json:"authorId"`
	AuthorName   string     `json:"authorName"`
	CategoryID   *int64     `json:"categoryId"`
	CategoryName string     `json:"categoryName"`
	CategorySlug string     `json:"categorySlug"`
	Title        string     `json:"title"`
	Slug         string     `json:"slug"`
	Excerpt      string     `json:"excerpt"`
	ContentMD    string     `json:"contentMd,omitempty"`
	CoverURL     string     `json:"coverUrl"`
	Status       string     `json:"status"`
	Tags         []Term     `json:"tags"`
	PublishedAt  *time.Time `json:"publishedAt"`
	CreatedAt    time.Time  `json:"createdAt"`
	UpdatedAt    time.Time  `json:"updatedAt"`
}

type PostInput struct {
	Title      string  `json:"title"`
	Slug       string  `json:"slug"`
	Excerpt    string  `json:"excerpt"`
	ContentMD  string  `json:"contentMd"`
	CoverURL   string  `json:"coverUrl"`
	Status     string  `json:"status"`
	CategoryID *int64  `json:"categoryId"`
	TagIDs     []int64 `json:"tagIds"`
}

type PostFilter struct {
	PublishedOnly bool
	Status        string
	Query         string
	CategorySlug  string
	TagSlug       string
	Page          int
	PageSize      int
}
