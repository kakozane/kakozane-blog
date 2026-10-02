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

func TestCommentEditOwnershipAndWindow(t *testing.T) {
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
	username := "commenttest" + strconv.FormatInt(time.Now().UnixNano(), 36)
	user, err := db.ExecContext(ctx, "INSERT INTO users (username, display_name, password_hash) VALUES (?, 'Test', 'unused')", username)
	if err != nil {
		t.Fatal(err)
	}
	userID, err := user.LastInsertId()
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() {
		if _, err := db.ExecContext(ctx, "DELETE FROM users WHERE id = ?", userID); err != nil {
			t.Errorf("delete test user: %v", err)
		}
	})
	post, err := db.ExecContext(ctx, "INSERT INTO posts (author_id, kind, title, slug, content_md, status, published_at) VALUES (?, 'post', ?, ?, 'test', 'published', NOW())", adminID, username, username)
	if err != nil {
		t.Fatal(err)
	}
	postID, err := post.LastInsertId()
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() {
		if _, err := db.ExecContext(ctx, "DELETE FROM posts WHERE id = ?", postID); err != nil {
			t.Errorf("delete test post: %v", err)
		}
	})
	comment, err := db.ExecContext(ctx, "INSERT INTO comments (post_id, user_id, author_name, body) VALUES (?, ?, 'Test', 'first')", postID, userID)
	if err != nil {
		t.Fatal(err)
	}
	commentID, err := comment.LastInsertId()
	if err != nil {
		t.Fatal(err)
	}
	repo := NewCommentRepository(db, nil)
	items, total, err := repo.List(ctx, postID, userID, []string{"pending", "rejected"}, 1, 50)
	if err != nil || total != 1 || len(items) != 1 || items[0].ID != commentID {
		t.Fatalf("own comments = %+v, total %d, error %v", items, total, err)
	}
	if _, err := repo.EditOwn(ctx, postID, adminID, commentID, "other user"); !errors.Is(err, ErrNotFound) {
		t.Fatalf("other user's edit = %v, want not found", err)
	}
	if item, err := repo.EditOwn(ctx, postID, userID, commentID, "first"); err != nil || item.Body != "first" {
		t.Fatalf("unchanged edit = %+v, error %v", item, err)
	}
	if _, err := db.ExecContext(ctx, "UPDATE comments SET status = 'rejected' WHERE id = ?", commentID); err != nil {
		t.Fatal(err)
	}
	if item, err := repo.EditOwn(ctx, postID, userID, commentID, "revised"); err != nil || item.Body != "revised" || item.Status != "pending" {
		t.Fatalf("rejected edit = %+v, error %v", item, err)
	}
	if _, err := db.ExecContext(ctx, "UPDATE comments SET created_at = NOW() - INTERVAL 11 MINUTE WHERE id = ?", commentID); err != nil {
		t.Fatal(err)
	}
	if _, err := repo.EditOwn(ctx, postID, userID, commentID, "late"); !errors.Is(err, ErrNotFound) {
		t.Fatalf("expired edit = %v, want not found", err)
	}
	if _, err := db.ExecContext(ctx, "UPDATE comments SET created_at = NOW(), status = 'approved' WHERE id = ?", commentID); err != nil {
		t.Fatal(err)
	}
	if _, err := repo.EditOwn(ctx, postID, userID, commentID, "approved edit"); !errors.Is(err, ErrNotFound) {
		t.Fatalf("approved edit = %v, want not found", err)
	}
}
