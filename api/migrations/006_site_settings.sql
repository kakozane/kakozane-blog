CREATE TABLE IF NOT EXISTS site_settings (
    id TINYINT NOT NULL PRIMARY KEY,
    title VARCHAR(100) NOT NULL,
    tagline VARCHAR(240) NOT NULL,
    description VARCHAR(500) NOT NULL,
    about_md TEXT NOT NULL,
    site_url VARCHAR(255) NOT NULL,
    github_url VARCHAR(1024) NOT NULL DEFAULT '',
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO site_settings (id, title, tagline, description, about_md, site_url)
VALUES (1, 'Kakozane', '记录，思考，分享。', '记录技术实践、思考与生活的个人博客。', '这里记录技术实践、遇到的问题，以及一路上的想法。文章会持续更新。', 'https://kakozane.icu')
ON DUPLICATE KEY UPDATE id = id;
