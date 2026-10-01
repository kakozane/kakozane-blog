package migrations

import (
	"context"
	"database/sql"
	"embed"
	"fmt"
	"strings"
)

//go:embed *.sql
var files embed.FS

func Apply(ctx context.Context, db *sql.DB) error {
	if _, err := db.ExecContext(ctx, `CREATE TABLE IF NOT EXISTS schema_migrations (
		name VARCHAR(255) NOT NULL PRIMARY KEY,
		applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
	) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`); err != nil {
		return fmt.Errorf("create migration table: %w", err)
	}
	entries, err := files.ReadDir(".")
	if err != nil {
		return err
	}
	for _, entry := range entries {
		if entry.IsDir() || !strings.HasSuffix(entry.Name(), ".sql") {
			continue
		}
		var applied bool
		if err := db.QueryRowContext(ctx, "SELECT EXISTS(SELECT 1 FROM schema_migrations WHERE name = ?)", entry.Name()).Scan(&applied); err != nil {
			return err
		}
		if applied {
			continue
		}
		body, err := files.ReadFile(entry.Name())
		if err != nil {
			return err
		}
		// Migration SQL is kept to plain statements without stored procedures.
		for _, statement := range strings.Split(string(body), ";") {
			if statement = strings.TrimSpace(statement); statement == "" {
				continue
			}
			if _, err := db.ExecContext(ctx, statement); err != nil {
				return fmt.Errorf("apply %s: %w", entry.Name(), err)
			}
		}
		if _, err := db.ExecContext(ctx, "INSERT INTO schema_migrations (name) VALUES (?)", entry.Name()); err != nil {
			return fmt.Errorf("record %s: %w", entry.Name(), err)
		}
	}
	return nil
}
