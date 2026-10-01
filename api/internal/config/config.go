package config

import (
	"fmt"
	"os"
	"strconv"

	"github.com/goccy/go-yaml"
)

type Config struct {
	Server struct {
		Port int `yaml:"port"`
	} `yaml:"server"`
	MySQL struct {
		Host     string `yaml:"host"`
		Port     int    `yaml:"port"`
		Database string `yaml:"database"`
		User     string `yaml:"user"`
		Password string `yaml:"password"`
	} `yaml:"mysql"`
	Redis struct {
		Address string `yaml:"address"`
	} `yaml:"redis"`
	Media struct {
		Directory string `yaml:"directory"`
	} `yaml:"media"`
}

func Load(path string) (Config, error) {
	var cfg Config
	data, err := os.ReadFile(path)
	if err != nil {
		return cfg, fmt.Errorf("read config %s: %w", path, err)
	}
	if err := yaml.UnmarshalWithOptions(data, &cfg, yaml.Strict()); err != nil {
		return cfg, fmt.Errorf("decode config %s: %w", path, err)
	}
	if value := os.Getenv("BLOG_SERVER_PORT"); value != "" {
		cfg.Server.Port, err = strconv.Atoi(value)
		if err != nil {
			return cfg, fmt.Errorf("invalid BLOG_SERVER_PORT: %w", err)
		}
	}
	if value := os.Getenv("BLOG_MYSQL_HOST"); value != "" {
		cfg.MySQL.Host = value
	}
	if value := os.Getenv("BLOG_REDIS_ADDRESS"); value != "" {
		cfg.Redis.Address = value
	}
	if value := os.Getenv("BLOG_MEDIA_DIRECTORY"); value != "" {
		cfg.Media.Directory = value
	}
	if cfg.Media.Directory == "" {
		cfg.Media.Directory = "uploads"
	}
	if cfg.Server.Port < 1 || cfg.Server.Port > 65535 || cfg.MySQL.Port < 1 || cfg.MySQL.Port > 65535 || cfg.MySQL.Host == "" || cfg.MySQL.Database == "" || cfg.MySQL.User == "" || cfg.MySQL.Password == "" || cfg.Redis.Address == "" {
		return cfg, fmt.Errorf("config requires valid server/mysql ports and all mysql/redis fields")
	}
	return cfg, nil
}
