package model

import "time"

type Comment struct {
	ID         int64     `json:"id"`
	PostID     int64     `json:"postId"`
	PostTitle  string    `json:"postTitle,omitempty"`
	UserID     *int64    `json:"userId"`
	AuthorName string    `json:"authorName"`
	ParentID   *int64    `json:"parentId"`
	Body       string    `json:"body"`
	Status     string    `json:"status"`
	CreatedAt  time.Time `json:"createdAt"`
}

type CommentInput struct {
	Body     string `json:"body"`
	ParentID *int64 `json:"parentId"`
}
