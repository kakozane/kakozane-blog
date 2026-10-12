package service

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
	"github.com/kakozane/kakozane-blog/api/internal/repository"
	"github.com/redis/go-redis/v9"
)

func TestVerifiedRegistration(t *testing.T) {
	path, address := os.Getenv("BLOG_TEST_CONFIG"), os.Getenv("BLOG_TEST_REDIS")
	if path == "" || address == "" {
		t.Skip("requires migrated test database and disposable Redis")
	}
	cfg, err := config.Load(path)
	if err != nil {
		t.Fatal(err)
	}
	options := mysql.NewConfig()
	options.User = cfg.MySQL.User
	options.Passwd = cfg.MySQL.Password
	options.DBName = cfg.MySQL.Database
	options.Net = "tcp"
	options.Addr = net.JoinHostPort(cfg.MySQL.Host, strconv.Itoa(cfg.MySQL.Port))
	options.ParseTime = true
	db, err := sql.Open("mysql", options.FormatDSN())
	if err != nil {
		t.Fatal(err)
	}
	defer db.Close()
	client := redis.NewClient(&redis.Options{Addr: address})
	defer client.Close()
	ctx := context.Background()
	prefix := "mailtest" + strconv.FormatInt(time.Now().UnixNano(), 36)
	repo := repository.NewUserRepository(db, client)
	sender := NewRegistrationEmail(client, "", "")
	s := NewUserService(repo, sender)
	input := model.RegistrationInput{UserInput: model.UserInput{Username: prefix, DisplayName: "Email test", Password: "test-password-123", Role: "admin"}, Email: prefix + "@example.com", Code: "123456"}
	key := "register:email:" + emailDigest(input.Email) + ":code"
	defer db.ExecContext(ctx, "DELETE FROM users WHERE username IN (?, ?, ?)", prefix, prefix+"b", prefix+"c")
	defer client.Del(ctx, key, "register:ip:"+emailDigest(prefix))
	if _, err := s.Register(ctx, input, prefix); !errors.Is(err, ErrEmailCode) {
		t.Fatal("unverified signup accepted", err)
	}
	seed := func() {
		if err := client.Set(ctx, key, emailDigest(input.Email+":"+input.Code)+":0", 10*time.Minute).Err(); err != nil {
			t.Fatal(err)
		}
	}
	seed()
	user, err := s.Register(ctx, input, prefix)
	if err != nil {
		t.Fatal(err)
	}
	if user.Role != "reader" {
		t.Fatal("role escalation")
	}
	var email string
	var verified sql.NullTime
	if err := db.QueryRowContext(ctx, "SELECT email,email_verified_at FROM users WHERE id=?", user.ID).Scan(&email, &verified); err != nil || email != input.Email || !verified.Valid {
		t.Fatal("email not persisted", err)
	}
	input.Username = prefix + "b"
	if _, err := s.Register(ctx, input, prefix); !errors.Is(err, ErrEmailCode) {
		t.Fatal("code replay accepted", err)
	}
	seed()
	if _, err := s.Register(ctx, input, prefix); !errors.Is(err, ErrConflict) {
		t.Fatal("duplicate email accepted", err)
	}
	// Administrator-created and historical accounts remain valid without an email.
	if _, err := s.Create(ctx, model.UserInput{Username: prefix + "c", DisplayName: "Legacy account", Password: "test-password-123", Role: "reader"}); err != nil {
		t.Fatal(err)
	}
}
