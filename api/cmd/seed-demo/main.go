package main

import (
	"context"
	"database/sql"
	"flag"
	"fmt"
	"github.com/go-sql-driver/mysql"
	"github.com/kakozane/kakozane-blog/api/internal/config"
	"net"
	"os"
	"strconv"
	"time"
)

func main() {
	apply := flag.Bool("apply", false, "write demo content; default only previews")
	flag.Parse()
	if err := run(*apply); err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}
}
func run(apply bool) error {
	items := demoContent()
	if !apply {
		fmt.Printf("将生成 %d 条演示内容，2020—2026 年各 10 条；使用 --apply 写入。\n", len(items))
		return nil
	}
	path := os.Getenv("BLOG_CONFIG_PATH")
	if path == "" {
		path = "config.yaml"
	}
	cfg, err := config.Load(path)
	if err != nil {
		return err
	}
	connection := mysql.NewConfig()
	connection.User, connection.Passwd, connection.DBName = cfg.MySQL.User, cfg.MySQL.Password, cfg.MySQL.Database
	connection.Net, connection.Addr = "tcp", net.JoinHostPort(cfg.MySQL.Host, strconv.Itoa(cfg.MySQL.Port))
	db, err := sql.Open("mysql", connection.FormatDSN())
	if err != nil {
		return err
	}
	defer db.Close()
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()
	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()
	var author int64
	if err := tx.QueryRowContext(ctx, "SELECT id FROM users WHERE role = 'admin' AND status = 'active' ORDER BY id LIMIT 1").Scan(&author); err != nil {
		return err
	}
	terms := map[string]int64{}
	for _, term := range []struct{ table, slug, name string }{{"categories", "demo-engineering", "演示 · 技术实践"}, {"categories", "demo-journal", "演示 · 日常手记"}, {"tags", "demo-content", "演示内容"}, {"tags", "demo-go", "Go"}, {"tags", "demo-react", "React"}, {"tags", "demo-reading", "阅读与记录"}} {
		var id int64
		err := tx.QueryRowContext(ctx, "SELECT id FROM "+term.table+" WHERE slug = ?", term.slug).Scan(&id)
		if err == sql.ErrNoRows {
			r, e := tx.ExecContext(ctx, "INSERT INTO "+term.table+" (name,slug) VALUES (?,?)", term.name, term.slug)
			if e != nil {
				return e
			}
			id, err = r.LastInsertId()
		}
		if err != nil {
			return err
		}
		terms[term.slug] = id
	}
	added, skipped := 0, 0
	for _, item := range items {
		var exists bool
		if err := tx.QueryRowContext(ctx, "SELECT EXISTS(SELECT 1 FROM posts WHERE slug = ?)", item.Slug).Scan(&exists); err != nil {
			return err
		}
		if exists {
			skipped++
			continue
		}
		category, tag := terms["demo-journal"], terms["demo-reading"]
		if item.Kind == "post" {
			category, tag = terms["demo-engineering"], terms["demo-go"]
			if item.Index%2 == 1 {
				tag = terms["demo-react"]
			}
		}
		result, err := tx.ExecContext(ctx, "INSERT INTO posts (author_id,category_id,kind,title,slug,excerpt,content_md,cover_url,status,pinned,published_at,created_at,updated_at) VALUES (?,?,?,?,?,?,?,'','published',false,?,?,?)", author, category, item.Kind, item.Title, item.Slug, item.Excerpt, item.Body, item.Date, item.Date, item.Date)
		if err != nil {
			return err
		}
		id, err := result.LastInsertId()
		if err != nil {
			return err
		}
		if _, err = tx.ExecContext(ctx, "INSERT INTO post_tags (post_id,tag_id) VALUES (?,?),(?,?)", id, terms["demo-content"], id, tag); err != nil {
			return err
		}
		added++
	}
	if err := tx.Commit(); err != nil {
		return err
	}
	fmt.Printf("完成：新增 %d 条，跳过已存在 %d 条；原有内容未修改。\n", added, skipped)
	return nil
}
