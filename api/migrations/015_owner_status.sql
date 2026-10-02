ALTER TABLE site_settings
    ADD COLUMN status_emoji VARCHAR(32) NOT NULL DEFAULT '' AFTER avatar_url,
    ADD COLUMN status_text VARCHAR(160) NOT NULL DEFAULT '' AFTER status_emoji,
    ADD COLUMN status_until DATETIME NULL DEFAULT NULL AFTER status_text;
