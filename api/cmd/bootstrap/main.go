package main

import (
	"context"
	"crypto/rand"
	"database/sql"
	"encoding/base64"
	"fmt"
	"log/slog"
	"net"
	"os"
	"strconv"
	"time"

	"github.com/go-sql-driver/mysql"
	"github.com/kakozane/kakozane-blog/api/internal/config"
	"github.com/kakozane/kakozane-blog/api/internal/password"
)

func main() {
	if err := run(); err != nil {
		slog.Error("bootstrap failed", "error", err)
		os.Exit(1)
	}
}

func run() error {
	path := os.Getenv("BLOG_CONFIG_PATH")
	if path == "" {
		path = "config.yaml"
	}
	cfg, err := config.Load(path)
	if err != nil {
		return err
	}
	mySQLConfig := mysql.NewConfig()
	mySQLConfig.User = cfg.MySQL.User
	mySQLConfig.Passwd = cfg.MySQL.Password
	mySQLConfig.Net = "tcp"
	mySQLConfig.Addr = net.JoinHostPort(cfg.MySQL.Host, strconv.Itoa(cfg.MySQL.Port))
	mySQLConfig.DBName = cfg.MySQL.Database
	db, err := sql.Open("mysql", mySQLConfig.FormatDSN())
	if err != nil {
		return err
	}
	defer db.Close()
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	schema, err := os.ReadFile("migrations/001_users.sql")
	if err != nil {
		return err
	}
	if _, err := db.ExecContext(ctx, string(schema)); err != nil {
		return fmt.Errorf("create users table: %w", err)
	}
	var exists bool
	if err := db.QueryRowContext(ctx, "SELECT EXISTS(SELECT 1 FROM users WHERE username = 'admin')").Scan(&exists); err != nil {
		return err
	}
	if exists {
		fmt.Println("管理员账号 admin 已存在，未修改密码")
		return nil
	}
	random := make([]byte, 24)
	if _, err := rand.Read(random); err != nil {
		return err
	}
	secret := base64.RawURLEncoding.EncodeToString(random)
	hash, err := password.Hash(secret)
	if err != nil {
		return err
	}
	const credentialsPath = "bootstrap-admin.txt"
	file, err := os.OpenFile(credentialsPath, os.O_CREATE|os.O_EXCL|os.O_WRONLY, 0600)
	if err != nil {
		return fmt.Errorf("create credentials file: %w", err)
	}
	if _, err := fmt.Fprintf(file, "username: admin\npassword: %s\n", secret); err != nil {
		file.Close()
		os.Remove(credentialsPath)
		return err
	}
	if err := file.Close(); err != nil {
		os.Remove(credentialsPath)
		return err
	}
	if _, err := db.ExecContext(ctx, "INSERT INTO users (username, display_name, password_hash, role) VALUES (?, ?, ?, ?)", "admin", "Kakozane", hash, "admin"); err != nil {
		os.Remove(credentialsPath)
		return err
	}
	fmt.Println("已创建管理员 admin；初始密码保存在 api/bootstrap-admin.txt（仅本机）")
	return nil
}
