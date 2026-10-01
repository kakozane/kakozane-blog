package repository

import (
	"context"
	"crypto/rand"
	"database/sql"
	"encoding/hex"
	"errors"
	"log/slog"
	"os"
	"path/filepath"

	"github.com/kakozane/kakozane-blog/api/internal/model"
)

type MediaRepository struct {
	db        *sql.DB
	directory string
}

func NewMediaRepository(db *sql.DB, directory string) (*MediaRepository, error) {
	if err := os.MkdirAll(directory, 0755); err != nil {
		return nil, err
	}
	return &MediaRepository{db: db, directory: directory}, nil
}

func (r *MediaRepository) Save(ctx context.Context, ownerID int64, data []byte, extension, mime string, width, height int) (model.Media, error) {
	random := make([]byte, 16)
	if _, err := rand.Read(random); err != nil {
		return model.Media{}, err
	}
	name := hex.EncodeToString(random) + extension
	path := filepath.Join(r.directory, name)
	file, err := os.OpenFile(path, os.O_WRONLY|os.O_CREATE|os.O_EXCL, 0644)
	if err != nil {
		return model.Media{}, err
	}
	if _, err := file.Write(data); err != nil {
		file.Close()
		os.Remove(path)
		return model.Media{}, err
	}
	if err := file.Close(); err != nil {
		os.Remove(path)
		return model.Media{}, err
	}
	result, err := r.db.ExecContext(ctx, "INSERT INTO media (owner_id, filename, mime_type, size_bytes, width, height) VALUES (?, ?, ?, ?, ?, ?)", ownerID, name, mime, len(data), width, height)
	if err != nil {
		os.Remove(path)
		return model.Media{}, err
	}
	id, err := result.LastInsertId()
	if err != nil {
		return model.Media{}, err
	}
	return r.ByID(ctx, id)
}

func (r *MediaRepository) ByID(ctx context.Context, id int64) (model.Media, error) {
	var item model.Media
	var name string
	err := r.db.QueryRowContext(ctx, "SELECT id, filename, mime_type, size_bytes, width, height, created_at FROM media WHERE id = ?", id).
		Scan(&item.ID, &name, &item.MimeType, &item.SizeBytes, &item.Width, &item.Height, &item.CreatedAt)
	if errors.Is(err, sql.ErrNoRows) {
		return model.Media{}, ErrNotFound
	}
	item.URL = "/uploads/" + name
	return item, err
}

func (r *MediaRepository) List(ctx context.Context, page int) ([]model.Media, int64, error) {
	var total int64
	if err := r.db.QueryRowContext(ctx, "SELECT COUNT(*) FROM media").Scan(&total); err != nil {
		return nil, 0, err
	}
	rows, err := r.db.QueryContext(ctx, "SELECT id, filename, mime_type, size_bytes, width, height, created_at FROM media ORDER BY id DESC LIMIT 40 OFFSET ?", (page-1)*40)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()
	items := []model.Media{}
	for rows.Next() {
		var item model.Media
		var name string
		if err := rows.Scan(&item.ID, &name, &item.MimeType, &item.SizeBytes, &item.Width, &item.Height, &item.CreatedAt); err != nil {
			return nil, 0, err
		}
		item.URL = "/uploads/" + name
		items = append(items, item)
	}
	return items, total, rows.Err()
}

func (r *MediaRepository) Delete(ctx context.Context, id int64) error {
	var name string
	if err := r.db.QueryRowContext(ctx, "SELECT filename FROM media WHERE id = ?", id).Scan(&name); errors.Is(err, sql.ErrNoRows) {
		return ErrNotFound
	} else if err != nil {
		return err
	}
	if filepath.Base(name) != name {
		return errors.New("invalid stored media filename")
	}
	result, err := r.db.ExecContext(ctx, "DELETE FROM media WHERE id = ?", id)
	if err := affected(result, err); err != nil {
		return err
	}
	// ponytail: a failed unlink leaves an orphan file; add a cleanup job if this becomes frequent.
	if err := os.Remove(filepath.Join(r.directory, name)); err != nil && !errors.Is(err, os.ErrNotExist) {
		slog.Warn("remove orphan media file", "filename", name, "error", err)
	}
	return nil
}
