import { Alert, Button, Card, Col, Descriptions, Input, Row, Space, Statistic, Switch, Table, Tabs, Tag, Typography } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { useEffect, useState } from 'react'
import { getMonitor } from '../api/monitor'
import type { ComponentMetrics, DatabaseTable, Metric, MonitorSnapshot, RedisKeyspace, RouteMetric } from '../types/monitor'

function format(value: number, unit: string) {
  if (unit === 'bytes') {
    const units = ['B', 'KiB', 'MiB', 'GiB', 'TiB']
    let index = 0
    while (value >= 1024 && index < units.length - 1) { value /= 1024; index++ }
    return `${value.toFixed(index ? 1 : 0)} ${units[index]}`
  }
  if (unit === 's') return `${Math.floor(value / 86400)} 天 ${Math.floor(value % 86400 / 3600)} 时 ${Math.floor(value % 3600 / 60)} 分`
  return `${Number.isInteger(value) ? value.toLocaleString() : value.toFixed(2)} ${unit}`
}
function Metrics({ data }: { data: ComponentMetrics }) {
  const states = { ok: ['正常', 'success'], partial: ['部分可用', 'warning'], error: ['不可用', 'error'], pending: ['采集中', 'processing'] } as const
  const [label, color] = states[data.status]
  return <Space orientation="vertical" size="middle" style={{ display: 'flex' }}>
    <Tag color={color}>{label}</Tag>
    {data.message && <Alert title={data.message} type={data.status === 'error' ? 'error' : 'info'} showIcon />}
    <Row gutter={[16, 16]}>{(data.metrics ?? []).map((m: Metric) => <Col xs={24} sm={12} xl={8} key={m.key}><Card size="small"><Statistic title={m.label} value={format(m.value, m.unit)} /></Card></Col>)}</Row>
  </Space>
}
function ConnectionDetails({ data }: { data: ComponentMetrics }) {
  const connection = data.connection
  if (!connection) return null
  return <Card size="small" title="连接与实例信息" style={{ marginBottom: 16 }}>
    <Descriptions size="small" column={{ xs: 1, sm: 2, xl: 3 }} items={[
      { key: 'host', label: 'API 连接主机', children: <Typography.Text copyable>{connection.host || '—'}</Typography.Text> },
      { key: 'port', label: 'API 连接端口', children: connection.port || '—' },
      { key: 'database', label: '配置的数据库', children: connection.database || '—' },
      { key: 'ips', label: '解析 IP', children: connection.resolvedIPs.length ? connection.resolvedIPs.join(' / ') : connection.resolveFailed ? '解析失败' : '—' },
      ...(data.details ?? []).map(item => ({ key: `detail-${item.key}`, label: item.label, children: item.value || '—' })),
    ]} />
    <Typography.Paragraph type="secondary" style={{ marginTop: 12, marginBottom: 0 }}>地址是 API 访问数据库使用的地址；解析 IP 来自本次采样的 DNS 查询，可能是容器内网 IP。实例监听端口不一定等于宿主机映射端口。</Typography.Paragraph>
  </Card>
}
const tableColumns: ColumnsType<DatabaseTable> = [
  { title: '库名', dataIndex: 'schema', width: 180 },
  { title: '表 / 视图名', dataIndex: 'name', width: 220, sorter: (a, b) => a.name.localeCompare(b.name), render: (v: string) => <Typography.Text copyable>{v}</Typography.Text> },
  { title: '类型', dataIndex: 'type', width: 110, render: (v: string) => v === 'BASE TABLE' ? '表' : v === 'VIEW' ? '视图' : v },
  { title: '引擎', dataIndex: 'engine', width: 100, render: (v: string | null) => v ?? '—' },
  { title: '行数（估计）', dataIndex: 'rows', width: 140, render: (v: number | null) => v?.toLocaleString() ?? '—', sorter: (a, b) => (a.rows ?? -1) - (b.rows ?? -1) },
  { title: '数据空间', dataIndex: 'dataBytes', width: 130, render: (v: number | null) => v === null ? '—' : format(v, 'bytes'), sorter: (a, b) => (a.dataBytes ?? -1) - (b.dataBytes ?? -1) },
  { title: '索引空间', dataIndex: 'indexBytes', width: 130, render: (v: number | null) => v === null ? '—' : format(v, 'bytes'), sorter: (a, b) => (a.indexBytes ?? -1) - (b.indexBytes ?? -1) },
  { title: '排序规则', dataIndex: 'collation', width: 210, render: (v: string | null) => v ?? '—' },
  { title: '创建时间', dataIndex: 'createdAt', width: 200, render: (v: string | null) => v ? new Date(v).toLocaleString() : '—' },
]
function MySQLMonitor({ data }: { data: ComponentMetrics }) {
  const [query, setQuery] = useState('')
  const search = query.trim().toLowerCase()
  const tables = (data.tables ?? []).filter(table => `${table.schema}.${table.name}`.toLowerCase().includes(search))
  return <>
    <ConnectionDetails data={data} />
    <Card title="当前数据库表清单" size="small" style={{ marginBottom: 16 }}>
      <Typography.Paragraph type="secondary">仅展示当前博客库。InnoDB 行数和空间来自数据库统计，可能延迟更新；视图无对应存储指标时显示「—」。</Typography.Paragraph>
      {data.tablesTruncated && <Alert type="warning" showIcon title="当前仅采集空间最大的 500 张表 / 视图；搜索和排序仅针对已加载清单。" style={{ marginBottom: 12 }} />}
      <Input.Search aria-label="搜索库名或表名" placeholder="搜索库名或表名" allowClear value={query} onChange={e => setQuery(e.target.value)} style={{ maxWidth: 360, marginBottom: 16 }} />
      <Table<DatabaseTable> rowKey={r => `${r.schema}.${r.name}`} dataSource={tables} columns={tableColumns} size="small" scroll={{ x: 1520 }} pagination={{ pageSize: 10, showSizeChanger: false, showTotal: total => `共 ${total} 项` }} />
    </Card>
    <Typography.Paragraph type="secondary">下面为当前 MySQL 实例指标；累计值从数据库实例启动开始统计。慢查询计数受数据库慢查询阈值影响。</Typography.Paragraph>
    <Metrics data={data} />
  </>
}
function RedisMonitor({ data }: { data: ComponentMetrics }) {
  return <>
    <ConnectionDetails data={data} />
    <Card title="Redis 数据库概况" size="small" style={{ marginBottom: 16 }}>
      <Typography.Paragraph type="secondary">Redis 按 db 编号区分逻辑库，没有 MySQL 那样的表。下方列出 INFO 可见的非空库，键名和内容不采集；平均剩余有效期为过期键的采样估计，0 表示尚无有效估计。</Typography.Paragraph>
      <Table<RedisKeyspace> rowKey="database" dataSource={data.keyspaces ?? []} size="small" scroll={{ x: 600 }} pagination={{ pageSize: 10, showSizeChanger: false }} columns={[
        { title: '数据库', dataIndex: 'database', render: (v: number) => <Space>db{v}{data.connection?.database === `db${v}` && <Tag color="blue">当前连接</Tag>}</Space> },
        { title: '键数', dataIndex: 'keys', render: (v: number) => v.toLocaleString(), sorter: (a, b) => a.keys - b.keys },
        { title: '有过期时间的键', dataIndex: 'expires', render: (v: number) => v.toLocaleString() },
        { title: '平均剩余有效期', dataIndex: 'avgTtlMs', render: (v: number) => v > 0 ? `${(v / 1000).toLocaleString(undefined, { maximumFractionDigits: 1 })} 秒` : '—' },
      ]} />
    </Card>
    <Metrics data={data} />
  </>
}
function metric(data: ComponentMetrics, key: string) { return data.metrics?.find(m => m.key === key)?.value }
function alerts(data: MonitorSnapshot): string[] {
  const result: string[] = []
  if (data.mysql.status === 'error') result.push('MySQL 不可用，登录和内容操作可能失败。')
  if (data.redis.status === 'error') result.push('Redis 不可用，会话和验证码功能可能失败。')
  for (const [key, label, threshold] of [['cpu', '系统 CPU 使用率', 90], ['memory_percent', '系统内存使用率', 90], ['disk_percent', '上传磁盘使用率', 85]] as const) {
    const value = metric(data.server, key)
    if (value !== undefined && value >= threshold) result.push(`${label}达到 ${value.toFixed(1)}%。`)
  }
  if ((metric(data.redis, 'blocked_clients') ?? 0) > 0) result.push('Redis 存在阻塞客户端，请检查业务调用。')
  if (metric(data.redis, 'rdb_last_bgsave_status') === 0) result.push('Redis 最近一次 RDB 保存失败。')
  const max = metric(data.redis, 'maxmemory') ?? 0
  if (max > 0 && (metric(data.redis, 'used_memory') ?? 0) / max > .9) result.push('Redis 已使用超过 90% 的内存上限。')
  if (data.droppedLogs || data.failedLogs) result.push(`本次进程已丢弃 ${data.droppedLogs} 条日志，写入失败 ${data.failedLogs} 条；日志可能不完整。`)
  if (data.cleanupFailed) result.push('历史日志清理失败，请检查数据库连接和 DELETE 权限。')
  const first = data.history.at(-2), last = data.history.at(-1)
  if (first && last && last.errors > first.errors) result.push(`最近一次采样间隔出现 ${last.errors - first.errors} 次 HTTP 5xx，请查看异常日志。`)
  return result
}
const columns: ColumnsType<RouteMetric> = [
  { title: '接口', key: 'route', render: (_, r) => <><Tag>{r.method}</Tag><Typography.Text code>{r.route}</Typography.Text></> },
  { title: '请求数', dataIndex: 'requests', sorter: (a, b) => a.requests - b.requests },
  { title: '4xx', dataIndex: 'clientErrors' },
  { title: '5xx', dataIndex: 'errors', sorter: (a, b) => a.errors - b.errors },
  { title: '慢请求 ≥ 1s', dataIndex: 'slow' },
  { title: '平均耗时', dataIndex: 'averageMs', render: (v: number) => `${v.toFixed(1)} ms`, sorter: (a, b) => a.averageMs - b.averageMs },
  { title: '最大耗时', dataIndex: 'maxMs', render: (v: number) => `${v.toFixed(1)} ms` },
]
export default function Monitor() {
  const [data, setData] = useState<MonitorSnapshot | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [loadedAt, setLoadedAt] = useState(0)
  const [auto, setAuto] = useState(true)
  const [reload, setReload] = useState(0)
  useEffect(() => {
    const controller = new AbortController()
    let timer: ReturnType<typeof setTimeout> | undefined
    async function load() {
      setLoading(true)
      try { const value = await getMonitor(controller.signal); if (!controller.signal.aborted) { setData(value); setLoadedAt(Date.now()); setError('') } }
      catch (e) { if (!controller.signal.aborted) setError(e instanceof Error ? e.message : '监控加载失败') }
      finally { if (!controller.signal.aborted) { setLoading(false); if (auto) timer = setTimeout(() => { void load() }, 15000) } }
    }
    void load()
    return () => { controller.abort(); clearTimeout(timer) }
  }, [auto, reload])
  const warnings = data ? alerts(data) : []
  const totals = data?.routes.reduce((a, r) => ({ requests: a.requests + r.requests, errors: a.errors + r.errors, slow: a.slow + r.slow }), { requests: 0, errors: 0, slow: 0 })
  const history = data?.history.map((point, i, all) => {
    const previous = all[i - 1]
    const seconds = previous ? (Date.parse(point.at) - Date.parse(previous.at)) / 1000 : 0
    return { ...point, rate: previous && seconds > 0 ? (point.requests - previous.requests) / seconds : null, intervalErrors: previous ? point.errors - previous.errors : null }
  }) ?? []
  return <section className="admin-page">
    <div className="admin-page-heading"><div><Typography.Title level={2}>运行监控</Typography.Title><Typography.Text type="secondary">每 15 秒采样；接口统计从 API 启动开始，趋势保留最近 30 分钟，重启后重置。</Typography.Text></div><Space><Switch checked={auto} onChange={setAuto} checkedChildren="自动刷新" unCheckedChildren="暂停刷新" aria-label="自动刷新监控" /><Button loading={loading} onClick={() => setReload(n => n + 1)}>刷新</Button></Space></div>
    {error && <Alert type="error" showIcon title={error} description="以下可能是上次成功加载的数据。" style={{ marginBottom: 16 }} />}
    {data && <>
      <Typography.Paragraph type="secondary">采样时间：{data.sampledAt.startsWith('0001') ? '等待首次采样' : new Date(data.sampledAt).toLocaleString()} · API 启动：{new Date(data.startedAt).toLocaleString()} · 待写日志：{data.queueDepth}</Typography.Paragraph>
      {loadedAt - Date.parse(data.sampledAt) > 60000 && <Alert title="采样数据已超过 1 分钟未更新" type="warning" showIcon style={{ marginBottom: 16 }} />}
      {warnings.length > 0 && <Alert type="warning" showIcon title="需要关注" description={<ul>{warnings.map(w => <li key={w}>{w}</li>)}</ul>} style={{ marginBottom: 16 }} />}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={8}><Card><Statistic title="累计 API 请求" value={totals?.requests ?? 0} /></Card></Col>
        <Col xs={24} sm={8}><Card><Statistic title="HTTP 5xx 比例" value={totals?.requests ? totals.errors / totals.requests * 100 : 0} precision={2} suffix="%" /></Card></Col>
        <Col xs={24} sm={8}><Card><Statistic title="累计慢请求" value={totals?.slow ?? 0} /></Card></Col>
      </Row>
      <Tabs items={[
        { key: 'server', label: '服务器 / API', children: <Metrics data={data.server} /> },
        { key: 'mysql', label: 'MySQL', children: <MySQLMonitor data={data.mysql} /> },
        { key: 'redis', label: 'Redis', children: <RedisMonitor data={data.redis} /> },
        { key: 'routes', label: '接口性能', children: <Table<RouteMetric> rowKey={r => `${r.method} ${r.route}`} dataSource={data.routes} columns={columns} scroll={{ x: 1000 }} pagination={{ pageSize: 15, showSizeChanger: false }} /> },
        { key: 'history', label: '近期趋势', children: <Table rowKey="at" dataSource={[...history].reverse()} pagination={{ pageSize: 15, showSizeChanger: false }} columns={[
          { title: '采样时间', dataIndex: 'at', render: (v: string) => new Date(v).toLocaleTimeString() },
          { title: 'API 请求 / 秒', dataIndex: 'rate', render: (v: number | null) => v === null ? '—' : v.toFixed(2) },
          { title: '间隔内 5xx', dataIndex: 'intervalErrors', render: (v: number | null) => v ?? '—' },
          { title: '系统 CPU', dataIndex: 'cpu', render: (v?: number) => v === undefined ? '—' : `${v.toFixed(1)}%` },
          { title: '系统内存', dataIndex: 'memory', render: (v?: number) => v === undefined ? '—' : `${v.toFixed(1)}%` },
        ]} /> },
      ]} />
    </>}
  </section>
}
