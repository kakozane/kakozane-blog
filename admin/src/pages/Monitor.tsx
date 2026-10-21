import { Alert, Button, Card, Col, Row, Space, Statistic, Switch, Table, Tabs, Tag, Typography } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { useEffect, useState } from 'react'
import { getMonitor } from '../api/monitor'
import type { ComponentMetrics, Metric, MonitorSnapshot, RouteMetric } from '../types/monitor'

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
        { key: 'mysql', label: 'MySQL', children: <><Alert title="实例状态为当前 MySQL 实例累计值；库大小和表数仅限博客数据库。慢查询计数取决于 MySQL 的慢查询配置。" type="info" style={{ marginBottom: 16 }} /><Metrics data={data.mysql} /></> },
        { key: 'redis', label: 'Redis', children: <Metrics data={data.redis} /> },
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
