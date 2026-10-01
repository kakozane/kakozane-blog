package model

import "time"

type Media struct {
	ID        int64     `json:"id"`
	URL       string    `json:"url"`
	MimeType  string    `json:"mimeType"`
	SizeBytes int64     `json:"sizeBytes"`
	Width     int       `json:"width"`
	Height    int       `json:"height"`
	CreatedAt time.Time `json:"createdAt"`
}
