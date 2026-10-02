CREATE INDEX post_likes_recent_idx ON post_likes (created_at, post_id, user_id);
