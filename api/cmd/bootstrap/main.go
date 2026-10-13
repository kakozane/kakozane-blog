// bootstrap 用于首次连接全新数据库时，手动初始化表结构并创建初始管理员。
// 在 api 目录运行：go run ./cmd/bootstrap。
// 运行前需创建目标数据库，并在 config.yaml 中配置可访问的 MySQL 地址和账号；
// 也可通过 BLOG_CONFIG_PATH 指定配置文件。请确认连接的是预期环境的数据库。
//
// 此程序独立于 cmd/server，启动 API 或 make dev 不会自动执行它。
// 日常部署更新、服务重启无需再运行：server 会自动应用尚未执行的数据库迁移。
// 重复运行仍会应用迁移，但如果 admin 已存在，会跳过创建，不重置其密码。
// 新建管理员的初始密码写入当前工作目录下的 bootstrap-admin.txt，首次登录后应修改密码。
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
	"github.com/kakozane/kakozane-blog/api/migrations"
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
	// 先应用迁移，确保首次创建管理员时 users 表已经存在。
	if err := migrations.Apply(ctx, db); err != nil {
		return fmt.Errorf("apply migrations: %w", err)
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
	// 仅当前系统用户可读写；若文件已存在则报错，避免覆盖之前保存的初始凭据。
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
