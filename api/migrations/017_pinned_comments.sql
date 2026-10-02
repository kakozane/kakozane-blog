ALTER TABLE comments
    ADD COLUMN pinned BOOLEAN NOT NULL DEFAULT FALSE,
    ADD INDEX comments_public_pin_idx (post_id, status, pinned, created_at, id);
