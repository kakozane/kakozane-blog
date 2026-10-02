package repository

import (
	"context"
	"database/sql"
	"errors"
	"net"
	"os"
	"strconv"
	"testing"
	"time"

	"github.com/go-sql-driver/mysql"
	"github.com/kakozane/kakozane-blog/api/internal/config"
	"github.com/kakozane/kakozane-blog/api/internal/model"
)

func TestPagePublishing(t *testing.T) {
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
	mySQL.Net, mySQL.Addr, mySQL.ParseTime = "tcp", net.JoinHostPort(cfg.MySQL.Host, strconv.Itoa(cfg.MySQL.Port)), true
	db, err := sql.Open("mysql", mySQL.FormatDSN())
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { db.Close() })
	ctx := context.Background()
	repo := NewPageRepository(db)
	slug := "pagetest" + strconv.FormatInt(time.Now().UnixNano(), 36)
	draft, err := repo.Save(ctx, 0, model.Page{Title: slug, Slug: slug, Status: "draft"})
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() {
		if err := repo.Delete(ctx, draft.ID); err != nil && !errors.Is(err, ErrNotFound) {
			t.Error(err)
		}
	})
	if _, err := repo.PublishedBySlug(ctx, slug); !errors.Is(err, ErrNotFound) {
		t.Fatalf("draft lookup: got %v, want not found", err)
	}
	if items, err := repo.Search(ctx, slug); err != nil || hasPage(items, draft.ID) {
		t.Fatalf("draft search = %+v, error %v", items, err)
	}
	marker := "bodyterm" + slug
	published, err := repo.Save(ctx, draft.ID, model.Page{Title: slug, Slug: slug, ContentMD: "## Public\n" + marker, Status: "published"})
	if err != nil {
		t.Fatal(err)
	}
	if published.PublishedAt == nil {
		t.Fatal("published page has no publication time")
	}
	bySlug, err := repo.PublishedBySlug(ctx, slug)
	if err != nil || bySlug.ID != draft.ID || bySlug.ContentMD != "## Public\n"+marker {
		t.Fatalf("published lookup = %+v, error %v", bySlug, err)
	}
	if items, err := repo.Search(ctx, marker); err != nil || !hasPage(items, draft.ID) {
		t.Fatalf("published body search = %+v, error %v", items, err)
	}
	if items, err := repo.Search(ctx, "%"); err != nil || hasPage(items, draft.ID) {
		t.Fatalf("literal percent search = %+v, error %v", items, err)
	}
	public, err := repo.List(ctx, true)
	if err != nil {
		t.Fatal(err)
	}
	found := false
	for _, item := range public {
		if item.ID == draft.ID {
			found = true
			if item.ContentMD != "" {
				t.Fatal("public list loaded full page content")
			}
		}
	}
	if !found {
		t.Fatal("published page missing from public list")
	}
	if _, err := repo.Save(ctx, draft.ID, model.Page{Title: slug, Slug: slug, ContentMD: "## Public", Status: "draft"}); err != nil {
		t.Fatal(err)
	}
	if _, err := repo.PublishedBySlug(ctx, slug); !errors.Is(err, ErrNotFound) {
		t.Fatalf("unpublished lookup: got %v, want not found", err)
	}
	if items, err := repo.Search(ctx, marker); err != nil || hasPage(items, draft.ID) {
		t.Fatalf("unpublished search = %+v, error %v", items, err)
	}
}

func hasPage(items []model.Page, id int64) bool {
	for _, item := range items {
		if item.ID == id {
			return true
		}
	}
	return false
}
