ALTER TABLE posts
    ADD COLUMN kind VARCHAR(16) NOT NULL DEFAULT 'post' AFTER category_id,
    ADD INDEX posts_kind_public_idx (kind, status, published_at, id);
