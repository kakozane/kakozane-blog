package model

import "time"

type Term struct {
	ID   int64  `json:"id"`
	Name string `json:"name"`
	Slug string `json:"slug"`
}

type NoteSeries struct {
	Term
	Count int64 `json:"count"`
}

type Post struct {
	ID           int64      `json:"id"`
	AuthorID     int64      `json:"authorId"`
	AuthorName   string     `json:"authorName"`
	CategoryID   *int64     `json:"categoryId"`
	CategoryName string     `json:"categoryName"`
	CategorySlug string     `json:"categorySlug"`
	Kind         string     `json:"kind"`
	Title        string     `json:"title"`
	Slug         string     `json:"slug"`
	Excerpt      string     `json:"excerpt"`
	ContentMD    string     `json:"contentMd,omitempty"`
	CoverURL     string     `json:"coverUrl"`
	Status       string     `json:"status"`
	Pinned       bool       `json:"pinned"`
	Tags         []Term     `json:"tags"`
	PublishedAt  *time.Time `json:"publishedAt"`
	CreatedAt    time.Time  `json:"createdAt"`
	UpdatedAt    time.Time  `json:"updatedAt"`
}

type PostInput struct {
	Kind       string  `json:"kind"`
	Title      string  `json:"title"`
	Slug       string  `json:"slug"`
	Excerpt    string  `json:"excerpt"`
	ContentMD  string  `json:"contentMd"`
	CoverURL   string  `json:"coverUrl"`
	Status     string  `json:"status"`
	Pinned     bool    `json:"pinned"`
	CategoryID *int64  `json:"categoryId"`
	TagIDs     []int64 `json:"tagIds"`
}

type PostFilter struct {
	PublishedOnly bool
	PinnedFirst   bool
	FeaturedOnly  bool
	Kind          string
	Status        string
	Query         string
	CategorySlug  string
	TagSlug       string
	Year          int
	Month         string
	Sort          string
	Page          int
	PageSize      int
}

type MonthCount struct {
	Month string `json:"month"`
	Count int64  `json:"count"`
}

type PublicationStats struct {
	Posts            int64      `json:"posts"`
	Notes            int64      `json:"notes"`
	Thoughts         int64      `json:"thoughts"`
	FirstPublishedAt *time.Time `json:"firstPublishedAt"`
}

type PostLink struct {
	ID    int64  `json:"id"`
	Title string `json:"title"`
	Slug  string `json:"slug"`
}

type PostConnections struct {
	Items    []Post    `json:"items"`
	Previous *PostLink `json:"previous"`
	Next     *PostLink `json:"next"`
}
