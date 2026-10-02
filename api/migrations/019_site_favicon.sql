ALTER TABLE site_settings
    ADD COLUMN favicon_url VARCHAR(1024) NOT NULL DEFAULT '' AFTER avatar_url;
