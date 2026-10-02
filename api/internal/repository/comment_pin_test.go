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
)

func TestPinnedCommentOrderingAndLocation(t *testing.T) {
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
	var adminID int64
	if err := db.QueryRowContext(ctx, "SELECT id FROM users WHERE role = 'admin' LIMIT 1").Scan(&adminID); err != nil {
		t.Fatal(err)
	}
	slug := "commentpin" + strconv.FormatInt(time.Now().UnixNano(), 36)
	result, err := db.ExecContext(ctx, "INSERT INTO posts (author_id, kind, title, slug, content_md, status, published_at) VALUES (?, 'post', 'Pin test', ?, 'test', 'published', NOW())", adminID, slug)
	if err != nil {
		t.Fatal(err)
	}
	postID, err := result.LastInsertId()
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() {
		if _, err := db.ExecContext(ctx, "DELETE FROM posts WHERE id = ?", postID); err != nil {
			t.Errorf("delete test post: %v", err)
		}
	})

	ids := make([]int64, 51)
	for i := range ids {
		result, err := db.ExecContext(ctx, "INSERT INTO comments (post_id, author_name, body, status) VALUES (?, 'Test', 'test', 'approved')", postID)
		if err != nil {
			t.Fatal(err)
		}
		ids[i], err = result.LastInsertId()
		if err != nil {
			t.Fatal(err)
		}
	}
	repo := NewCommentRepository(db, nil)
	if page, err := repo.PublicPageOf(ctx, postID, ids[50]); err != nil || page != 2 {
		t.Fatalf("last comment before pin: page %d, err %v", page, err)
	}
	if item, err := repo.SetPinned(ctx, ids[50], true); err != nil || !item.Pinned {
		t.Fatalf("pin comment: %+v, err %v", item, err)
	}
	items, total, err := repo.List(ctx, postID, 0, []string{"approved"}, 1, 50)
	if err != nil || total != 51 || len(items) != 50 || items[0].ID != ids[50] {
		t.Fatalf("pinned first page: first %+v, total %d, err %v", items, total, err)
	}
	if page, err := repo.PublicPageOf(ctx, postID, ids[50]); err != nil || page != 1 {
		t.Fatalf("pinned comment location: page %d, err %v", page, err)
	}
	if page, err := repo.PublicPageOf(ctx, postID, ids[49]); err != nil || page != 2 {
		t.Fatalf("displaced comment location: page %d, err %v", page, err)
	}
	if item, err := repo.SetStatus(ctx, ids[50], "rejected"); err != nil || item.Pinned {
		t.Fatalf("rejected comment still pinned: %+v, err %v", item, err)
	}
	if _, err := repo.PublicPageOf(ctx, postID, ids[50]); !errors.Is(err, ErrNotFound) {
		t.Fatalf("rejected comment location: %v, want not found", err)
	}
}
