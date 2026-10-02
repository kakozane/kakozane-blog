package main

import (
	_ "embed"
	"encoding/json"
)

//go:embed content.json
var contentJSON []byte

type entry struct {
	Kind, Title, Slug, Excerpt, Body, Date string
	Index                                  int
}

func demoContent() []entry {
	var items []entry
	if err := json.Unmarshal(contentJSON, &items); err != nil {
		panic(err)
	}
	return items
}
