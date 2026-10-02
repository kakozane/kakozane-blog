package model

type PublishedEvent struct {
	Kind  string `json:"kind"`
	Title string `json:"title"`
	Slug  string `json:"slug"`
}
