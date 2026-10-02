package main

import (
	"strings"
	"testing"
	"time"
)

func TestDemoContent(t *testing.T) {
	items := demoContent()
	if len(items) != 70 {
		t.Fatalf("got %d entries", len(items))
	}
	seen, years, kinds := map[string]bool{}, map[int]int{}, map[string]int{}
	for _, item := range items {
		date, err := time.Parse("2006-01-02 15:04:05", item.Date)
		if err != nil || date.Year() < 2020 || date.Year() > 2026 || date.After(time.Date(2026, 10, 2, 0, 0, 0, 0, time.UTC)) {
			t.Fatalf("invalid date: %s", item.Date)
		}
		if seen[item.Slug] || !strings.HasPrefix(item.Slug, "demo-") || !strings.Contains(item.Body, "演示") {
			t.Fatalf("invalid demo: %s", item.Slug)
		}
		seen[item.Slug] = true
		years[date.Year()]++
		kinds[item.Kind]++
	}
	for year := 2020; year <= 2026; year++ {
		if years[year] != 10 {
			t.Fatalf("year %d: %d", year, years[year])
		}
	}
	if kinds["post"] != 28 || kinds["note"] != 21 || kinds["thought"] != 21 {
		t.Fatal(kinds)
	}
}
