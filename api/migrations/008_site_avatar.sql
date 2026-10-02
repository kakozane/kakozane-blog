ALTER TABLE site_settings
    ADD COLUMN avatar_url VARCHAR(1024) NOT NULL DEFAULT '' AFTER github_url;
