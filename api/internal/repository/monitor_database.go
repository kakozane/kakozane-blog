package repository

import (
	"context"
	"net"
	"sort"
	"strconv"
	"strings"
	"time"

	"github.com/kakozane/kakozane-blog/api/internal/model"
)

func monitorPartial(result *model.MonitorComponent, message string) {
	result.Status = "partial"
	if result.Message != "" {
		result.Message += "；"
	}
	result.Message += message
}

func monitorConnection(ctx context.Context, address, database string) *model.MonitorConnection {
	host, port, err := net.SplitHostPort(address)
	result := &model.MonitorConnection{Host: host, Port: port, Database: database, ResolvedIPs: []string{}}
	if err != nil {
		result.ResolveFailed = true
		return result
	}
	// DNS 结果用于定位容器，不代表连接池中某个已有连接的实际对端。
	ctx, cancel := context.WithTimeout(ctx, 500*time.Millisecond)
	defer cancel()
	ips, err := net.DefaultResolver.LookupHost(ctx, host)
	if err != nil {
		result.ResolveFailed = true
	} else {
		sort.Strings(ips)
		result.ResolvedIPs = ips
	}
	return result
}

func (r *MonitorRepository) mysqlDetails(ctx context.Context, result *model.MonitorComponent) {
	fields := []model.MonitorDetail{
		{Key: "database", Label: "当前数据库"}, {Key: "version", Label: "MySQL 版本"},
		{Key: "hostname", Label: "实例主机名"}, {Key: "port", Label: "实例监听端口"},
		{Key: "account", Label: "当前数据库账号"}, {Key: "charset", Label: "库默认字符集"},
		{Key: "collation", Label: "库默认排序规则"}, {Key: "timezone", Label: "实例时区"},
	}
	if err := r.db.QueryRowContext(ctx, `SELECT COALESCE(DATABASE(),''), VERSION(), @@hostname, @@port, CURRENT_USER(), @@character_set_database, @@collation_database, @@global.time_zone`).Scan(
		&fields[0].Value, &fields[1].Value, &fields[2].Value, &fields[3].Value,
		&fields[4].Value, &fields[5].Value, &fields[6].Value, &fields[7].Value,
	); err != nil {
		monitorPartial(result, "MySQL 实例和库信息不可读")
	} else {
		result.Details = fields
	}
	var maxConnections, bufferBytes, readOnly, slowLog, longQuery float64
	if err := r.db.QueryRowContext(ctx, `SELECT @@global.max_connections, @@global.innodb_buffer_pool_size, @@global.read_only, @@global.slow_query_log, @@global.long_query_time`).Scan(&maxConnections, &bufferBytes, &readOnly, &slowLog, &longQuery); err != nil {
		monitorPartial(result, "MySQL 运行参数不可读")
	} else {
		result.Metrics = append(result.Metrics,
			metric("max_connections", "实例最大连接数", maxConnections, ""),
			metric("buffer_pool_bytes", "InnoDB 缓冲池容量", bufferBytes, "bytes"),
			metric("read_only", "实例只读（1 是 / 0 否）", readOnly, ""),
			metric("slow_query_log", "慢查询日志（1 开启 / 0 关闭）", slowLog, ""),
			metric("long_query_time", "慢查询阈值", longQuery*1000, "ms"))
	}
}

func (r *MonitorRepository) mysqlTables(ctx context.Context, result *model.MonitorComponent) error {
	// shortcut: 每次只采集空间最大的 500 张表；超过后再增加服务端分页查询。
	const limit = 500
	rows, err := r.db.QueryContext(ctx, `SELECT table_schema, table_name, table_type, engine, table_rows, data_length, index_length, table_collation, create_time
 FROM information_schema.tables WHERE table_schema = DATABASE()
 ORDER BY COALESCE(data_length,0) + COALESCE(index_length,0) DESC, table_name LIMIT ?`, limit+1)
	if err != nil {
		return err
	}
	defer rows.Close()
	tables := []model.MonitorTable{}
	for rows.Next() {
		var item model.MonitorTable
		if err := rows.Scan(&item.Schema, &item.Name, &item.Type, &item.Engine, &item.Rows, &item.DataBytes, &item.IndexBytes, &item.Collation, &item.CreatedAt); err != nil {
			return err
		}
		if len(tables) == limit {
			result.TablesTruncated = true
			break
		}
		tables = append(tables, item)
	}
	if err := rows.Err(); err != nil {
		return err
	}
	result.Tables = tables
	return nil
}

func redisDetails(info string) ([]model.MonitorDetail, []model.MonitorKeyspace) {
	labels := map[string]string{
		"redis_version": "Redis 版本", "redis_mode": "运行模式", "role": "复制角色",
		"os": "操作系统", "arch_bits": "架构位数", "tcp_port": "实例监听端口",
		"maxmemory_policy": "内存淘汰策略", "aof_last_write_status": "AOF 最近写入状态",
	}
	details := []model.MonitorDetail{}
	keyspaces := []model.MonitorKeyspace{}
	for _, line := range strings.Split(info, "\n") {
		key, value, ok := strings.Cut(strings.TrimSpace(line), ":")
		if !ok {
			continue
		}
		if label, ok := labels[key]; ok {
			details = append(details, model.MonitorDetail{Key: key, Label: label, Value: value})
		}
		if !strings.HasPrefix(key, "db") {
			continue
		}
		db, err := strconv.Atoi(strings.TrimPrefix(key, "db"))
		if err != nil || db < 0 {
			continue
		}
		values := map[string]int64{}
		for _, pair := range strings.Split(value, ",") {
			name, raw, _ := strings.Cut(pair, "=")
			if n, err := strconv.ParseInt(raw, 10, 64); err == nil && n >= 0 {
				values[name] = n
			}
		}
		keys, keysOK := values["keys"]
		expires, expiresOK := values["expires"]
		ttl, ttlOK := values["avg_ttl"]
		if keysOK && expiresOK && ttlOK {
			keyspaces = append(keyspaces, model.MonitorKeyspace{Database: db, Keys: keys, Expires: expires, AvgTTLMS: ttl})
		}
	}
	sort.Slice(keyspaces, func(i, j int) bool { return keyspaces[i].Database < keyspaces[j].Database })
	return details, keyspaces
}
