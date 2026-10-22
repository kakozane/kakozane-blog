package repository

import (
	"context"
	"database/sql"
	"strconv"
	"strings"
	"time"

	"github.com/kakozane/kakozane-blog/api/internal/model"
	"github.com/redis/go-redis/v9"
)

type MonitorRepository struct {
	db            *sql.DB
	redis         *redis.Client
	mysqlAddress  string
	mysqlDatabase string
}

func NewMonitorRepository(db *sql.DB, client *redis.Client, mysqlAddress, mysqlDatabase string) *MonitorRepository {
	return &MonitorRepository{db: db, redis: client, mysqlAddress: mysqlAddress, mysqlDatabase: mysqlDatabase}
}

func (r *MonitorRepository) InsertLog(ctx context.Context, item model.MonitorLog) error {
	_, err := r.db.ExecContext(ctx, `INSERT INTO monitor_logs
 (kind, scope, user_id, username, method, route, target_id, status, duration_ms, ip, user_agent, created_at)
 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, item.Kind, item.Scope, item.UserID, item.Username, item.Method, item.Route, item.TargetID, item.Status, item.DurationMS, item.IP, item.UserAgent, item.CreatedAt.UTC())
	return err
}
func logWhere(f model.MonitorLogFilter) (string, []any) {
	where := " WHERE kind = ? AND created_at >= ? AND created_at < ?"
	args := []any{f.Kind, f.From.UTC(), f.To.UTC()}
	if f.Scope != "" {
		where += " AND scope = ?"
		args = append(args, f.Scope)
	}
	if f.Result == "success" {
		where += " AND status < 400"
	}
	if f.Result == "failure" {
		where += " AND status >= 400"
	}
	if f.Query != "" {
		where += " AND (username = ? OR ip = ?)"
		args = append(args, f.Query, f.Query)
	}
	return where, args
}
func (r *MonitorRepository) ListLogs(ctx context.Context, f model.MonitorLogFilter) ([]model.MonitorLog, int64, error) {
	where, args := logWhere(f)
	var total int64
	if err := r.db.QueryRowContext(ctx, "SELECT COUNT(*) FROM monitor_logs"+where, args...).Scan(&total); err != nil {
		return nil, 0, err
	}
	rows, err := r.db.QueryContext(ctx, `SELECT id,kind,scope,user_id,username,method,route,target_id,status,duration_ms,ip,user_agent,created_at FROM monitor_logs`+where+" ORDER BY created_at DESC, id DESC LIMIT ? OFFSET ?", append(args, f.PageSize, (f.Page-1)*f.PageSize)...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()
	items := []model.MonitorLog{}
	for rows.Next() {
		var v model.MonitorLog
		if err := rows.Scan(&v.ID, &v.Kind, &v.Scope, &v.UserID, &v.Username, &v.Method, &v.Route, &v.TargetID, &v.Status, &v.DurationMS, &v.IP, &v.UserAgent, &v.CreatedAt); err != nil {
			return nil, 0, err
		}
		items = append(items, v)
	}
	return items, total, rows.Err()
}
func (r *MonitorRepository) Cleanup(ctx context.Context) error {
	// 分批删除，避免清理历史日志长时间占用数据库。
	_, err := r.db.ExecContext(ctx, "DELETE FROM monitor_logs WHERE created_at < ? LIMIT 5000", time.Now().UTC().AddDate(0, 0, -30))
	return err
}
func metric(key, label string, value float64, unit string) model.MonitorMetric {
	return model.MonitorMetric{Key: key, Label: label, Value: value, Unit: unit}
}

func (r *MonitorRepository) MySQL(ctx context.Context) model.MonitorComponent {
	result := model.MonitorComponent{Status: "ok", Metrics: []model.MonitorMetric{}, Connection: monitorConnection(ctx, r.mysqlAddress, r.mysqlDatabase)}
	start := time.Now()
	if err := r.db.PingContext(ctx); err != nil {
		result.Status = "error"
		result.Message = "MySQL 连接失败或超时"
		return result
	}
	result.Metrics = append(result.Metrics, metric("latency", "连接延迟", float64(time.Since(start).Microseconds())/1000, "ms"))
	stats := r.db.Stats()
	result.Metrics = append(result.Metrics, metric("pool_open", "API 连接池打开连接", float64(stats.OpenConnections), ""), metric("pool_in_use", "API 连接池使用中", float64(stats.InUse), ""), metric("pool_wait", "API 连接池累计等待", float64(stats.WaitCount), ""))
	if err := r.mysqlStatus(ctx, &result); err != nil {
		monitorPartial(&result, "MySQL 实例状态不可读")
	}
	r.mysqlDetails(ctx, &result)
	var size, tables float64
	if err := r.db.QueryRowContext(ctx, `SELECT COALESCE(SUM(data_length + index_length),0), COUNT(*) FROM information_schema.tables WHERE table_schema = DATABASE()`).Scan(&size, &tables); err == nil {
		result.Metrics = append(result.Metrics, metric("schema_bytes", "当前博客库大小（估计）", size, "bytes"), metric("tables", "当前博客库表 / 视图数", tables, ""))
	} else {
		monitorPartial(&result, "当前库大小和表数不可读")
	}
	if err := r.mysqlTables(ctx, &result); err != nil {
		monitorPartial(&result, "当前库表清单不可读")
	}
	return result
}

func (r *MonitorRepository) mysqlStatus(ctx context.Context, result *model.MonitorComponent) error {
	rows, err := r.db.QueryContext(ctx, `SHOW GLOBAL STATUS WHERE Variable_name IN ('Uptime','Threads_connected','Threads_running','Questions','Slow_queries','Aborted_connects','Innodb_buffer_pool_reads','Innodb_buffer_pool_read_requests')`)
	if err != nil {
		return err
	}
	defer rows.Close()
	labels := map[string]string{"Uptime": "实例运行时长", "Threads_connected": "实例连接数", "Threads_running": "实例活跃线程", "Questions": "累计查询", "Slow_queries": "累计慢查询", "Aborted_connects": "累计连接失败", "Innodb_buffer_pool_reads": "缓冲池磁盘读取", "Innodb_buffer_pool_read_requests": "缓冲池读取请求"}
	for rows.Next() {
		var key, value string
		if err := rows.Scan(&key, &value); err != nil {
			return err
		}
		if n, err := strconv.ParseFloat(value, 64); err == nil {
			unit := ""
			if key == "Uptime" {
				unit = "s"
			}
			result.Metrics = append(result.Metrics, metric(key, labels[key], n, unit))
		}
	}
	return rows.Err()
}

// 只返回允许的数值字段，不暴露 Redis 配置、键名和缓存内容。
func redisMetrics(info string) []model.MonitorMetric {
	labels := map[string]string{"uptime_in_seconds": "运行时长", "connected_clients": "连接数", "blocked_clients": "阻塞客户端", "used_memory": "已用内存", "used_memory_rss": "常驻内存", "maxmemory": "内存上限（0 为未限制）", "instantaneous_ops_per_sec": "每秒命令数", "keyspace_hits": "累计命中", "keyspace_misses": "累计未命中", "evicted_keys": "累计淘汰键", "expired_keys": "累计过期键", "rejected_connections": "累计拒绝连接", "rdb_last_bgsave_status": "RDB 最近保存（1 成功 / 0 失败）", "aof_enabled": "AOF 持久化（1 开启 / 0 关闭）"}
	metrics := []model.MonitorMetric{}
	values := map[string]float64{}
	for _, line := range strings.Split(info, "\n") {
		key, value, ok := strings.Cut(strings.TrimSpace(line), ":")
		if !ok {
			continue
		}
		label, ok := labels[key]
		if !ok {
			continue
		}
		if key == "rdb_last_bgsave_status" {
			if value == "ok" {
				value = "1"
			} else {
				value = "0"
			}
		}
		n, err := strconv.ParseFloat(value, 64)
		if err != nil {
			continue
		}
		values[key] = n
		unit := ""
		if strings.Contains(key, "memory") {
			unit = "bytes"
		}
		if key == "uptime_in_seconds" {
			unit = "s"
		}
		metrics = append(metrics, metric(key, label, n, unit))
	}
	hits, hOK := values["keyspace_hits"]
	misses, mOK := values["keyspace_misses"]
	if hOK && mOK && hits+misses > 0 {
		metrics = append(metrics, metric("hit_rate", "累计缓存命中率", hits/(hits+misses)*100, "%"))
	}
	return metrics
}
func (r *MonitorRepository) Redis(ctx context.Context) model.MonitorComponent {
	options := r.redis.Options()
	result := model.MonitorComponent{Status: "ok", Metrics: []model.MonitorMetric{}, Connection: monitorConnection(ctx, options.Addr, "db"+strconv.Itoa(options.DB))}
	start := time.Now()
	if err := r.redis.Ping(ctx).Err(); err != nil {
		result.Status = "error"
		result.Message = "Redis 连接失败或超时"
		return result
	}
	result.Metrics = append(result.Metrics, metric("latency", "PING 延迟", float64(time.Since(start).Microseconds())/1000, "ms"))
	info, err := r.redis.Info(ctx, "server", "clients", "memory", "stats", "persistence", "replication", "keyspace").Result()
	if err != nil {
		monitorPartial(&result, "Redis INFO 指标不可读（请检查 ACL）")
	} else {
		result.Metrics = append(result.Metrics, redisMetrics(info)...)
		result.Details, result.Keyspaces = redisDetails(info)
	}
	if count, err := r.redis.DBSize(ctx).Result(); err == nil {
		result.Metrics = append(result.Metrics, metric("keys", "当前数据库键数", float64(count), ""))
	} else {
		monitorPartial(&result, "当前数据库键数不可读")
	}
	return result
}
