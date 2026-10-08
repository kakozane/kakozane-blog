package service

import (
	"context"
	"errors"
	"log/slog"
	"net/url"
	"regexp"
	"strings"
	"time"
	"unicode/utf8"

	"github.com/go-sql-driver/mysql"
	"github.com/kakozane/kakozane-blog/api/internal/model"
	"github.com/kakozane/kakozane-blog/api/internal/repository"
)

var (
	ErrInvalidInput = errors.New("invalid input")
	ErrConflict     = errors.New("conflict")
	slugPattern     = regexp.MustCompile(`^[\pL\pN]+(?:-[\pL\pN]+)*$`)
)

type ContentService struct {
	repo   *repository.ContentRepository
	events *EventService
}

func NewContentService(repo *repository.ContentRepository, events *EventService) *ContentService {
	return &ContentService{repo: repo, events: events}
}

func (s *ContentService) PublicationStats(ctx context.Context) (model.PublicationStats, error) {
	return s.repo.PublicationStats(ctx)
}

func (s *ContentService) ListTerms(ctx context.Context, kind string, publicOnly bool) ([]model.Term, error) {
	return s.repo.ListTerms(ctx, kind, publicOnly)
}

func (s *ContentService) SaveTerm(ctx context.Context, kind string, id int64, input model.Term) (int64, error) {
	input.Name = strings.TrimSpace(input.Name)
	input.Slug = strings.ToLower(strings.TrimSpace(input.Slug))
	if utf8.RuneCountInString(input.Name) < 1 || utf8.RuneCountInString(input.Name) > 100 || !validSlug(input.Slug) {
		return 0, ErrInvalidInput
	}
	result, err := s.repo.SaveTerm(ctx, kind, id, input)
	return result, contentWriteError(err)
}

func (s *ContentService) DeleteTerm(ctx context.Context, kind string, id int64) error {
	if id < 1 {
		return ErrInvalidInput
	}
	return s.repo.DeleteTerm(ctx, kind, id)
}

func (s *ContentService) ListPosts(ctx context.Context, filter model.PostFilter) ([]model.Post, int64, error) {
	if filter.Page < 1 {
		filter.Page = 1
	}
	if filter.PageSize < 1 || filter.PageSize > 50 {
		filter.PageSize = 10
	}
	filter.Query = strings.TrimSpace(filter.Query)
	if filter.Kind == "" {
		filter.Kind = "all"
	}
	if filter.Month != "" {
		month, err := time.Parse("2006-01", filter.Month)
		if err != nil || month.Format("2006-01") != filter.Month || month.Year() < 2000 || month.Year() > 2100 {
			return nil, 0, ErrInvalidInput
		}
	}
	if filter.Page > 100000 || utf8.RuneCountInString(filter.Query) > 100 || len(filter.CategorySlug) > 160 || len(filter.TagSlug) > 160 ||
		(filter.Year != 0 && (filter.Year < 2000 || filter.Year > 2100)) ||
		(filter.Kind != "post" && filter.Kind != "note" && filter.Kind != "thought" && filter.Kind != "all") ||
		(filter.FeaturedOnly && filter.Kind != "note") ||
		(filter.Sort != "" && (filter.Sort != "oldest" && filter.Sort != "updated" || !filter.PublishedOnly)) ||
		(filter.Status != "" && filter.Status != "draft" && filter.Status != "published" && filter.Status != "trash") ||
		(filter.CategorySlug != "" && !validSlug(filter.CategorySlug)) || (filter.TagSlug != "" && !validSlug(filter.TagSlug)) {
		return nil, 0, ErrInvalidInput
	}
	return s.repo.ListPosts(ctx, filter)
}

func (s *ContentService) TimelineYears(ctx context.Context, featured bool) ([]int, error) {
	return s.repo.PublicYears(ctx, featured)
}

func (s *ContentService) MonthlyActivity(ctx context.Context) ([]model.MonthCount, error) {
	now := time.Now().UTC()
	end := time.Date(now.Year(), now.Month()+1, 1, 0, 0, 0, 0, time.UTC)
	counts, err := s.repo.PublishedMonthCounts(ctx, end.AddDate(0, -12, 0), end)
	if err != nil {
		return nil, err
	}
	return monthCounts(now, counts), nil
}

func monthCounts(now time.Time, counts map[string]int64) []model.MonthCount {
	month := time.Date(now.Year(), now.Month()-11, 1, 0, 0, 0, 0, time.UTC)
	items := make([]model.MonthCount, 12)
	for i := range items {
		key := month.AddDate(0, i, 0).Format("2006-01")
		items[i] = model.MonthCount{Month: key, Count: counts[key]}
	}
	return items
}

func (s *ContentService) PostByID(ctx context.Context, id int64) (model.Post, error) {
	return s.repo.PostByID(ctx, id)
}

func (s *ContentService) PublishedPostBySlug(ctx context.Context, slug string) (model.Post, error) {
	return s.repo.PublishedPostBySlug(ctx, slug)
}

func (s *ContentService) RelatedPosts(ctx context.Context, slug, kind string) (model.PostConnections, error) {
	post, err := s.repo.PublishedPostBySlug(ctx, slug)
	if err != nil {
		return model.PostConnections{}, err
	}
	if post.Kind != kind {
		return model.PostConnections{}, repository.ErrNotFound
	}
	items, err := s.repo.RelatedPosts(ctx, post)
	if err != nil {
		return model.PostConnections{}, err
	}
	previous, next, err := s.repo.AdjacentPosts(ctx, post)
	if err != nil {
		return model.PostConnections{}, err
	}
	return model.PostConnections{Items: items, Previous: previous, Next: next}, nil
}

func (s *ContentService) ListNoteSeries(ctx context.Context) ([]model.NoteSeries, error) {
	return s.repo.ListNoteSeries(ctx)
}

func (s *ContentService) SavePost(ctx context.Context, id, authorID int64, input model.PostInput) (model.Post, error) {
	input.Title = strings.TrimSpace(input.Title)
	input.Slug = strings.ToLower(strings.TrimSpace(input.Slug))
	input.Excerpt = strings.TrimSpace(input.Excerpt)
	input.CoverURL = strings.TrimSpace(input.CoverURL)
	if input.Kind == "" {
		input.Kind = "post"
	}
	if input.Status == "" {
		input.Status = "draft"
	}
	if utf8.RuneCountInString(input.Title) < 1 || utf8.RuneCountInString(input.Title) > 240 || !validSlug(input.Slug) ||
		utf8.RuneCountInString(input.Excerpt) > 500 || len(input.ContentMD) > 1024*1024 ||
		(input.Status != "draft" && input.Status != "published") || (input.Kind != "post" && input.Kind != "note" && input.Kind != "thought") || len(input.TagIDs) > 20 || !validCoverURL(input.CoverURL) ||
		(input.Kind == "thought" && utf8.RuneCountInString(input.ContentMD) > 2000) || (input.Kind == "thought" && input.Pinned) ||
		(input.Kind == "note" && input.Slug == "series") {
		return model.Post{}, ErrInvalidInput
	}
	if input.CategoryID != nil && *input.CategoryID < 1 {
		return model.Post{}, ErrInvalidInput
	}
	seen := map[int64]bool{}
	for _, tagID := range input.TagIDs {
		if tagID < 1 || seen[tagID] {
			return model.Post{}, ErrInvalidInput
		}
		seen[tagID] = true
	}
	if input.Status == "published" && strings.TrimSpace(input.ContentMD) == "" {
		return model.Post{}, ErrInvalidInput
	}
	wasPublished := false
	if id != 0 {
		previous, err := s.repo.PostByID(ctx, id)
		if err != nil {
			return model.Post{}, err
		}
		wasPublished = previous.Status == "published"
	}
	postID, err := s.repo.SavePost(ctx, id, authorID, input)
	if err != nil {
		return model.Post{}, contentWriteError(err)
	}
	post, err := s.repo.PostByID(ctx, postID)
	if err != nil {
		return model.Post{}, err
	}
	if post.Status == "published" && !wasPublished && s.events != nil {
		if err := s.events.Publish(ctx, model.PublishedEvent{Kind: post.Kind, Title: post.Title, Slug: post.Slug}); err != nil {
			slog.Warn("publish notification failed", "error", err)
		}
	}
	return post, nil
}

func (s *ContentService) DeletePost(ctx context.Context, id int64) error {
	if id < 1 {
		return ErrInvalidInput
	}
	return s.repo.DeletePost(ctx, id)
}

func validSlug(value string) bool {
	return value != "" && len(value) <= 160 && slugPattern.MatchString(value)
}

func validCoverURL(value string) bool {
	if value == "" {
		return true
	}
	if len(value) > 1024 || strings.HasPrefix(value, "//") {
		return false
	}
	if strings.HasPrefix(value, "/") {
		return true
	}
	parsed, err := url.Parse(value)
	return err == nil && parsed.Scheme == "https" && parsed.Host != ""
}

func contentWriteError(err error) error {
	var mysqlErr *mysql.MySQLError
	if errors.As(err, &mysqlErr) {
		switch mysqlErr.Number {
		case 1062:
			return ErrConflict
		case 1451:
			return ErrConflict
		case 1452:
			return ErrInvalidInput
		}
	}
	return err
}
