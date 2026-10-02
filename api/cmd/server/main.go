package main

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"log/slog"
	"net"
	"net/http"
	"os"
	"os/signal"
	"strconv"
	"syscall"
	"time"

	"github.com/go-sql-driver/mysql"
	"github.com/kakozane/kakozane-blog/api/internal/config"
	"github.com/kakozane/kakozane-blog/api/internal/handler"
	"github.com/kakozane/kakozane-blog/api/internal/repository"
	"github.com/kakozane/kakozane-blog/api/internal/router"
	"github.com/kakozane/kakozane-blog/api/internal/service"
	"github.com/kakozane/kakozane-blog/api/migrations"
	"github.com/redis/go-redis/v9"
)

func main() {
	if err := run(); err != nil {
		slog.Error("api stopped", "error", err)
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
	mySQLConfig.ParseTime = true
	mySQLConfig.ClientFoundRows = true
	db, err := sql.Open("mysql", mySQLConfig.FormatDSN())
	if err != nil {
		return fmt.Errorf("open mysql: %w", err)
	}
	defer db.Close()

	redisClient := redis.NewClient(&redis.Options{Addr: cfg.Redis.Address})
	defer redisClient.Close()

	// 在入口处组装依赖，业务层不负责创建数据库连接。
	healthService := service.NewHealthService(repository.NewHealthRepository(db, redisClient))
	authService := service.NewAuthService(repository.NewAuthRepository(db, redisClient))
	contentRepo := repository.NewContentRepository(db)
	eventService := service.NewEventService(repository.NewEventRepository(redisClient))
	contentService := service.NewContentService(contentRepo, eventService)
	userService := service.NewUserService(repository.NewUserRepository(db, redisClient))
	commentService := service.NewCommentService(repository.NewCommentRepository(db, redisClient), contentRepo, repository.NewAuthRepository(db, redisClient))
	likeService := service.NewLikeService(repository.NewLikeRepository(db), contentRepo)
	friendService := service.NewFriendService(repository.NewFriendRepository(db))
	projectService := service.NewProjectService(repository.NewProjectRepository(db))
	pageRepo := repository.NewPageRepository(db)
	pageService := service.NewPageService(pageRepo)
	sayService := service.NewSayService(repository.NewSayRepository(db))
	mediaRepo, err := repository.NewMediaRepository(db, cfg.Media.Directory)
	if err != nil {
		return fmt.Errorf("create media directory: %w", err)
	}
	mediaService := service.NewMediaService(mediaRepo)
	siteRepo := repository.NewSiteRepository(db)
	siteService := service.NewSiteService(siteRepo, eventService)
	feedService := service.NewFeedService(contentRepo, siteRepo, pageRepo)
	startupCtx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	if err := healthService.Check(startupCtx); err != nil {
		return fmt.Errorf("check dependencies: %w", err)
	}
	if err := migrations.Apply(startupCtx, db); err != nil {
		return fmt.Errorf("apply migrations: %w", err)
	}

	server := &http.Server{
		Addr:              net.JoinHostPort("", strconv.Itoa(cfg.Server.Port)),
		Handler:           router.New(handler.NewHealthHandler(healthService), handler.NewAuthHandler(authService, cfg.Auth.SSOSites), handler.NewContentHandler(contentService), handler.NewUserHandler(userService), handler.NewCommentHandler(commentService), handler.NewLikeHandler(likeService, authService), handler.NewEventHandler(eventService), handler.NewFriendHandler(friendService), handler.NewProjectHandler(projectService), handler.NewPageHandler(pageService), handler.NewSayHandler(sayService), handler.NewMediaHandler(mediaService), handler.NewSiteHandler(siteService), handler.NewFeedHandler(feedService, sayService)),
		ReadHeaderTimeout: 5 * time.Second,
	}
	shutdownCtx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()
	go func() {
		<-shutdownCtx.Done()
		ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()
		if err := server.Shutdown(ctx); err != nil {
			slog.Error("shutdown server", "error", err)
		}
	}()
	if err := server.ListenAndServe(); !errors.Is(err, http.ErrServerClosed) {
		return fmt.Errorf("serve: %w", err)
	}
	return nil
}
