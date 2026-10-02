package model

import "time"

type Comment struct {
	ID               int64     `json:"id"`
	PostID           int64     `json:"postId"`
	PostTitle        string    `json:"postTitle,omitempty"`
	PostKind         string    `json:"postKind,omitempty"`
	UserID           *int64    `json:"userId"`
	AuthorName       string    `json:"authorName"`
	ParentID         *int64    `json:"parentId"`
	ParentAuthorName string    `json:"parentAuthorName,omitempty"`
	Body             string    `json:"body"`
	Status           string    `json:"status"`
	Pinned           bool      `json:"pinned"`
	CreatedAt        time.Time `json:"createdAt"`
}

type CommentInput struct {
	Body     string `json:"body"`
	ParentID *int64 `json:"parentId"`
}

type RecentComment struct {
	ID         int64     `json:"id"`
	Kind       string    `json:"kind"`
	Slug       string    `json:"slug"`
	Title      string    `json:"title"`
	AuthorName string    `json:"authorName"`
	Body       string    `json:"body"`
	CreatedAt  time.Time `json:"createdAt"`
}
