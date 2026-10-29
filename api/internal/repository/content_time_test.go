package repository

import (
	"context"
	"database/sql"
	"github.com/go-sql-driver/mysql"
	"github.com/kakozane/kakozane-blog/api/internal/config"
	"github.com/kakozane/kakozane-blog/api/internal/model"
	"net"
	"os"
	"strconv"
	"testing"
	"time"
)

func TestPostHistoricalTimes(t *testing.T) {
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

	repo := NewContentRepository(db)
	created := time.Date(2015, 4, 3, 8, 0, 0, 0, time.FixedZone("CST", 8*3600))
	published := created.Add(24 * time.Hour)
	input := model.PostInput{Kind: "post", Title: "Historical", Slug: "historical-" + strconv.FormatInt(time.Now().UnixNano(), 36), ContentMD: "test", Status: "draft", CreatedAt: &created, PublishedAt: &published}
	id, err := repo.SavePost(ctx, 0, authorID, input)
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() {
		if _, err := db.Exec("DELETE FROM posts WHERE id=?", id); err != nil {
			t.Error(err)
		}
	})
	check := func(wantCreated, wantPublished time.Time) {
		t.Helper()
		post, err := repo.PostByID(ctx, id)
		if err != nil {
			t.Fatal(err)
		}
		if !post.CreatedAt.Equal(wantCreated) || post.PublishedAt == nil || !post.PublishedAt.Equal(wantPublished) {
			t.Fatalf("dates not preserved: %v %v", post.CreatedAt, post.PublishedAt)
		}
	}
	check(created, published)
	// 旧客户端省略字段、草稿转发布、重复编辑均不重置历史时间。
	input.CreatedAt, input.PublishedAt, input.Status = nil, nil, "published"
	if _, err := repo.SavePost(ctx, id, authorID, input); err != nil {
		t.Fatal(err)
	}
	check(created, published)
	created, published = created.Add(-time.Hour), published.Add(-time.Hour)
	input.CreatedAt, input.PublishedAt = &created, &published
	if _, err := repo.SavePost(ctx, id, authorID, input); err != nil {
		t.Fatal(err)
	}
	check(created, published)
	revisions, err := repo.Revisions(ctx, id)
	if err != nil {
		t.Fatal(err)
	}
	if len(revisions) == 0 || revisions[0].Snapshot.CreatedAt == nil || revisions[0].Snapshot.PublishedAt == nil || !revisions[0].Snapshot.CreatedAt.Equal(created) || !revisions[0].Snapshot.PublishedAt.Equal(published) {
		t.Fatal("revision lost historical times")
	}
	// 未选时间的新草稿没有发布时间，首次发布自动补齐。
	input.Slug += "-default"
	input.CreatedAt, input.PublishedAt, input.Status = nil, nil, "draft"
	otherID, err := repo.SavePost(ctx, 0, authorID, input)
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { db.Exec("DELETE FROM posts WHERE id=?", otherID) })
	draft, err := repo.PostByID(ctx, otherID)
	if err != nil {
		t.Fatal(err)
	}
	if draft.PublishedAt != nil || draft.CreatedAt.IsZero() {
		t.Fatal("incorrect default dates")
	}
	input.Status = "published"
	if _, err := repo.SavePost(ctx, otherID, authorID, input); err != nil {
		t.Fatal(err)
	}
	post, err := repo.PostByID(ctx, otherID)
	if err != nil || post.PublishedAt == nil || !post.CreatedAt.Equal(draft.CreatedAt) {
		t.Fatalf("publish defaults: %+v %v", post, err)
	}
}
