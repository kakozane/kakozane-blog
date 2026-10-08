package model

import "time"

type Revision struct {
	ID        int64     `json:"id"`
	Snapshot  PostInput `json:"snapshot"`
	CreatedAt time.Time `json:"createdAt"`
}
type WritingDraft struct {
	Key       string    `json:"key"`
	Version   int64     `json:"version"`
	Snapshot  PostInput `json:"snapshot"`
	UpdatedAt time.Time `json:"updatedAt"`
}
type ReplyNotification struct {
	ID         int64     `json:"id"`
	CommentID  int64     `json:"commentId"`
	Kind       string    `json:"kind"`
	Slug       string    `json:"slug"`
	Title      string    `json:"title"`
	AuthorName string    `json:"authorName"`
	Body       string    `json:"body"`
	Read       bool      `json:"read"`
	CreatedAt  time.Time `json:"createdAt"`
}
