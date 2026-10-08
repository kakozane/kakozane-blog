package config

import (
	"fmt"
	"net/url"
	"os"
	"strconv"

	"github.com/goccy/go-yaml"
)

type SSOSite struct {
	FrontOrigin string `yaml:"front_origin"`
	AdminOrigin string `yaml:"admin_origin"`
}

type Config struct {
	Auth struct {
		SSOSites []SSOSite `yaml:"sso_sites"`
	} `yaml:"auth"`
	Server struct {
		Port           int  `yaml:"port"`
		SwaggerEnabled bool `yaml:"swagger_enabled"`
	} `yaml:"server"`
	MySQL struct {
		Host     string `yaml:"host"`
		Port     int    `yaml:"port"`
		Database string `yaml:"database"`
		User     string `yaml:"user"`
		Password string `yaml:"password"`
	} `yaml:"mysql"`
	Redis struct {
		Address  string `yaml:"address"`
		Password string `yaml:"password"`
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
	seen := make(map[string]bool)
	for _, site := range cfg.Auth.SSOSites {
		for _, origin := range []string{site.FrontOrigin, site.AdminOrigin} {
			u, parseErr := url.Parse(origin)
			if parseErr != nil || u.Scheme != "https" || u.Hostname() == "" || u.User != nil || u.Path != "" || u.RawQuery != "" || u.ForceQuery || u.Fragment != "" || seen[origin] {
				return cfg, fmt.Errorf("auth.sso_sites requires unique HTTPS origins without paths")
			}
			seen[origin] = true
		}
	}
	if cfg.Server.Port < 1 || cfg.Server.Port > 65535 || cfg.MySQL.Port < 1 || cfg.MySQL.Port > 65535 || cfg.MySQL.Host == "" || cfg.MySQL.Database == "" || cfg.MySQL.User == "" || cfg.MySQL.Password == "" || cfg.Redis.Address == "" {
		return cfg, fmt.Errorf("config requires valid server/mysql ports and all mysql/redis fields")
	}
	return cfg, nil
}
