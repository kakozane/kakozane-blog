CREATE TABLE IF NOT EXISTS monitor_logs (
    id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    kind VARCHAR(16) NOT NULL,
    scope VARCHAR(16) NOT NULL,
    user_id BIGINT NOT NULL DEFAULT 0,
    username VARCHAR(128) NOT NULL DEFAULT '',
    method VARCHAR(16) NOT NULL,
    route VARCHAR(255) NOT NULL,
    target_id VARCHAR(32) NOT NULL DEFAULT '',
    status SMALLINT NOT NULL,
    duration_ms BIGINT NOT NULL,
    ip VARCHAR(64) NOT NULL DEFAULT '',
    user_agent VARCHAR(512) NOT NULL DEFAULT '',
    created_at DATETIME(3) NOT NULL,
    INDEX idx_monitor_kind_time (kind, created_at, id),
    INDEX idx_monitor_time (created_at),
    INDEX idx_monitor_user (username, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
