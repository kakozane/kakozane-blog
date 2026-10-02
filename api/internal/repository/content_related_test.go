package repository

import (
	"context"
	"database/sql"
	"net"
	"os"
	"strconv"
	"testing"
	"time"

	"github.com/go-sql-driver/mysql"
	"github.com/kakozane/kakozane-blog/api/internal/config"
	"github.com/kakozane/kakozane-blog/api/internal/model"
)

func TestRelatedPinnedAndAdjacentPosts(t *testing.T) {
	path := os.Getenv("BLOG_TEST_CONFIG")
	if path == "" {
		t.Skip("set BLOG_TEST_CONFIG to a disposable local database configuration")
	}
	cfg, err := config.Load(path)
	if err != nil {
		t.Fatal(err)
	}
	mySQL := mysql.NewConfig()
	mySQL.User, mySQL.Passwd, mySQL.DBName = cfg.MySQL.User, cfg.MySQL.Password, cfg.MySQL.Database
	mySQL.Net = "tcp"
	mySQL.Addr = net.JoinHostPort(cfg.MySQL.Host, strconv.Itoa(cfg.MySQL.Port))
	mySQL.ParseTime = true
	db, err := sql.Open("mysql", mySQL.FormatDSN())
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { db.Close() })
	ctx := context.Background()
	var authorID int64
	if err := db.QueryRowContext(ctx, "SELECT id FROM users WHERE role = 'admin' LIMIT 1").Scan(&authorID); err != nil {
		t.Fatal(err)
	}
	prefix := "relatedtest" + strconv.FormatInt(time.Now().UnixNano(), 36)
	result, err := db.ExecContext(ctx, "INSERT INTO tags (name, slug) VALUES (?, ?)", prefix, prefix)
	if err != nil {
		t.Fatal(err)
	}
	tagID, err := result.LastInsertId()
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() {
		if _, err := db.ExecContext(ctx, "DELETE FROM tags WHERE id = ?", tagID); err != nil {
			t.Error(err)
		}
	})
	categoryResult, err := db.ExecContext(ctx, "INSERT INTO categories (name, slug) VALUES (?, ?)", prefix, prefix)
	if err != nil {
		t.Fatal(err)
	}
	categoryID, err := categoryResult.LastInsertId()
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() {
		if _, err := db.ExecContext(ctx, "DELETE FROM categories WHERE id = ?", categoryID); err != nil {
			t.Error(err)
		}
	})
	insert := func(suffix, kind, status string, tagged bool) int64 {
		t.Helper()
		slug := prefix + suffix
		result, err := db.ExecContext(ctx, `INSERT INTO posts (author_id, kind, title, slug, content_md, status, published_at)
			VALUES (?, ?, ?, ?, 'test', ?, CASE WHEN ? = 'published' THEN CURRENT_TIMESTAMP ELSE NULL END)`,
			authorID, kind, slug, slug, status, status)
		if err != nil {
			t.Fatal(err)
		}
		id, err := result.LastInsertId()
		if err != nil {
			t.Fatal(err)
		}
		t.Cleanup(func() {
			if _, err := db.ExecContext(ctx, "DELETE FROM posts WHERE id = ?", id); err != nil {
				t.Error(err)
			}
		})
		if tagged {
			if _, err := db.ExecContext(ctx, "INSERT INTO post_tags (post_id, tag_id) VALUES (?, ?)", id, tagID); err != nil {
				t.Fatal(err)
			}
		}
		return id
	}
	source := insert("source", "post", "published", true)
	related := insert("related", "post", "published", true)
	draft := insert("draft", "post", "draft", true)
	note := insert("note", "note", "published", true)
	noteDraft := insert("notedraft", "note", "draft", false)
	unrelated := insert("unrelated", "post", "published", false)

	items, err := NewContentRepository(db).RelatedPosts(ctx, model.Post{ID: source, Kind: "post"})
	if err != nil {
		t.Fatal(err)
	}
	if len(items) < 2 || items[0].ID != related || items[1].ID != unrelated {
		t.Fatalf("related order = %+v, want tagged post before newer unrelated post", items)
	}
	for _, item := range items {
		if item.ID == source || item.ID == draft || item.ID == note {
			t.Fatalf("related list includes current, draft or different kind: %+v", items)
		}
	}
	if _, err := db.ExecContext(ctx, "UPDATE posts SET pinned = TRUE WHERE id = ?", source); err != nil {
		t.Fatal(err)
	}
	filter := model.PostFilter{PublishedOnly: true, PinnedFirst: true, Kind: "post", Query: prefix, Page: 1, PageSize: 10}
	pinned, total, err := NewContentRepository(db).ListPosts(ctx, filter)
	if err != nil {
		t.Fatal(err)
	}
	if total != 3 || len(pinned) != 3 || pinned[0].ID != source || !pinned[0].Pinned {
		t.Fatalf("pinned list = %+v, total %d; want pinned post first", pinned, total)
	}
	filter.PinnedFirst = false
	chronological, _, err := NewContentRepository(db).ListPosts(ctx, filter)
	if err != nil {
		t.Fatal(err)
	}
	if chronological[0].ID == source {
		t.Fatalf("chronological list unexpectedly starts with older pinned post: %+v", chronological)
	}

	sharedTime := time.Date(2037, 1, 1, 0, 0, 0, 0, time.UTC)
	if _, err := db.ExecContext(ctx, "UPDATE posts SET published_at = ? WHERE id IN (?, ?, ?, ?, ?)", sharedTime, source, related, draft, note, unrelated); err != nil {
		t.Fatal(err)
	}
	previous, next, err := NewContentRepository(db).AdjacentPosts(ctx, model.Post{ID: related, Kind: "post", PublishedAt: &sharedTime})
	if err != nil {
		t.Fatal(err)
	}
	if previous == nil || previous.ID != source || next == nil || next.ID != unrelated {
		t.Fatalf("adjacent posts = previous %+v, next %+v; want source and unrelated", previous, next)
	}

	if _, err := db.ExecContext(ctx, "UPDATE posts SET category_id = ? WHERE id IN (?, ?, ?)", categoryID, source, note, noteDraft); err != nil {
		t.Fatal(err)
	}
	series, err := NewContentRepository(db).ListNoteSeries(ctx)
	if err != nil {
		t.Fatal(err)
	}
	found := false
	for _, item := range series {
		if item.ID == categoryID {
			found = true
			if item.Count != 1 {
				t.Fatalf("series count = %d, want only the published note", item.Count)
			}
		}
	}
	if !found {
		t.Fatal("published note category missing from series")
	}
	notes, total, err := NewContentRepository(db).ListPosts(ctx, model.PostFilter{PublishedOnly: true, Kind: "note", CategorySlug: prefix, Page: 1, PageSize: 12})
	if err != nil {
		t.Fatal(err)
	}
	if total != 1 || len(notes) != 1 || notes[0].ID != note {
		t.Fatalf("series notes = %+v, total %d; want only published note", notes, total)
	}
	if _, err := db.ExecContext(ctx, "UPDATE posts SET pinned = TRUE WHERE id IN (?, ?)", note, noteDraft); err != nil {
		t.Fatal(err)
	}
	featured, featuredTotal, err := NewContentRepository(db).ListPosts(ctx, model.PostFilter{PublishedOnly: true, Kind: "note", FeaturedOnly: true, Page: 1, PageSize: 12})
	if err != nil {
		t.Fatal(err)
	}
	if featuredTotal != 1 || len(featured) != 1 || featured[0].ID != note {
		t.Fatalf("featured notes = %+v, total %d; want only published featured note", featured, featuredTotal)
	}
	featuredYears, err := NewContentRepository(db).PublicYears(ctx, true)
	if err != nil {
		t.Fatal(err)
	}
	if len(featuredYears) == 0 || featuredYears[0] != sharedTime.Year() {
		t.Fatalf("featured years = %+v; want %d", featuredYears, sharedTime.Year())
	}
	categoryItems, categoryTotal, err := NewContentRepository(db).ListPosts(ctx, model.PostFilter{PublishedOnly: true, Kind: "all", CategorySlug: prefix, Page: 1, PageSize: 12})
	if err != nil {
		t.Fatal(err)
	}
	if categoryTotal != 2 || len(categoryItems) != 2 {
		t.Fatalf("category items = %+v, total %d; want published article and note", categoryItems, categoryTotal)
	}
	tagItems, tagTotal, err := NewContentRepository(db).ListPosts(ctx, model.PostFilter{PublishedOnly: true, Kind: "all", TagSlug: prefix, Page: 1, PageSize: 12})
	if err != nil {
		t.Fatal(err)
	}
	if tagTotal != 3 || len(tagItems) != 3 {
		t.Fatalf("tag items = %+v, total %d; want published posts and note", tagItems, tagTotal)
	}
	hidden := prefix + "-draft"
	result, err = db.ExecContext(ctx, "INSERT INTO categories (name, slug) VALUES (?, ?)", hidden, hidden)
	if err != nil {
		t.Fatal(err)
	}
	hiddenCategoryID, err := result.LastInsertId()
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() {
		if _, err := db.ExecContext(ctx, "DELETE FROM categories WHERE id = ?", hiddenCategoryID); err != nil {
			t.Error(err)
		}
	})
	result, err = db.ExecContext(ctx, "INSERT INTO tags (name, slug) VALUES (?, ?)", hidden, hidden)
	if err != nil {
		t.Fatal(err)
	}
	hiddenTagID, err := result.LastInsertId()
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() {
		if _, err := db.ExecContext(ctx, "DELETE FROM tags WHERE id = ?", hiddenTagID); err != nil {
			t.Error(err)
		}
	})
	if _, err := db.ExecContext(ctx, "UPDATE posts SET category_id = ? WHERE id = ?", hiddenCategoryID, draft); err != nil {
		t.Fatal(err)
	}
	if _, err := db.ExecContext(ctx, "INSERT INTO post_tags (post_id, tag_id) VALUES (?, ?)", draft, hiddenTagID); err != nil {
		t.Fatal(err)
	}
	contains := func(items []model.Term, id int64) bool {
		for _, item := range items {
			if item.ID == id {
				return true
			}
		}
		return false
	}
	for _, tc := range []struct {
		kind, name      string
		visible, hidden int64
	}{{"categories", "category", categoryID, hiddenCategoryID}, {"tags", "tag", tagID, hiddenTagID}} {
		public, err := NewContentRepository(db).ListTerms(ctx, tc.kind, true)
		if err != nil {
			t.Fatal(err)
		}
		admin, err := NewContentRepository(db).ListTerms(ctx, tc.kind, false)
		if err != nil {
			t.Fatal(err)
		}
		if !contains(public, tc.visible) || contains(public, tc.hidden) || !contains(admin, tc.hidden) {
			t.Fatalf("%s visibility: public %+v, admin %+v", tc.name, public, admin)
		}
	}
}
