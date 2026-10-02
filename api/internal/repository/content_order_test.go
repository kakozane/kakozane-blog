package repository

import (
	"testing"

	"github.com/kakozane/kakozane-blog/api/internal/model"
)

func TestPostOrder(t *testing.T) {
	for _, test := range []struct {
		filter model.PostFilter
		want   string
	}{
		{model.PostFilter{PublishedOnly: true}, "p.published_at DESC, p.id DESC"},
		{model.PostFilter{PublishedOnly: true, Sort: "oldest"}, "p.published_at ASC, p.id ASC"},
		{model.PostFilter{PublishedOnly: true, Sort: "updated"}, "p.updated_at DESC, p.id DESC"},
		{model.PostFilter{PublishedOnly: true, PinnedFirst: true, Sort: "oldest"}, "p.pinned DESC, p.published_at ASC, p.id ASC"},
		{model.PostFilter{}, "p.updated_at DESC, p.id DESC"},
	} {
		if got := postOrder(test.filter); got != test.want {
			t.Errorf("postOrder(%+v) = %q, want %q", test.filter, got, test.want)
		}
	}
}
