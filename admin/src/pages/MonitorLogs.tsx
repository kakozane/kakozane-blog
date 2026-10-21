import { Alert, Button, DatePicker, Input, Select, Space, Table, Tag, Typography } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { useEffect, useState } from 'react'
import { getMonitorLogs } from '../api/monitor'
import type { LogFilter, LogKind, MonitorLog } from '../types/monitor'

const titles: Record<LogKind, string> = { login: '登录日志', operation: '操作日志', request: '异常与慢请求' }
export default function MonitorLogs({ kind }: { kind: LogKind }) {
  const [filter, setFilter] = useState<LogFilter>({ kind, page: 1 })
  const [data, setData] = useState<{ items: MonitorLog[]; total: number }>({ items: [], total: 0 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [reload, setReload] = useState(0)
  useEffect(() => {
    const controller = new AbortController()
    getMonitorLogs(filter, controller.signal).then(setData).catch((e: unknown) => {
      if (!controller.signal.aborted) setError(e instanceof Error ? e.message : '日志加载失败')
    }).finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [filter, reload])
  function search(update: Partial<LogFilter>) { setLoading(true); setError(''); setFilter(current => ({ ...current, ...update, page: 1 })) }
  const columns: ColumnsType<MonitorLog> = [
    { title: '时间', dataIndex: 'createdAt', width: 190, render: (v: string) => new Date(v).toLocaleString() },
    { title: '账号', dataIndex: 'username', width: 140, render: (v: string, row) => v || (row.userId ? `用户 #${row.userId}` : '未识别') },
    { title: '入口', dataIndex: 'scope', width: 85, render: (v: string) => v === 'admin' ? '后台' : '前台' },
    { title: '请求 / 操作', dataIndex: 'route', width: 350, render: (v: string, row) => <><Tag>{row.method}</Tag><Typography.Text code>{v}</Typography.Text>{row.targetId && <div>对象 ID：{row.targetId}</div>}</> },
    { title: '结果', dataIndex: 'status', width: 115, render: (v: number) => <Tag color={v < 400 ? 'success' : v >= 500 ? 'error' : 'warning'}>{v < 400 ? '成功' : '失败'} · {v}</Tag> },
    { title: '耗时', dataIndex: 'durationMs', width: 100, render: (v: number) => <Typography.Text type={v >= 1000 ? 'warning' : undefined}>{v} ms</Typography.Text> },
    { title: '来源 IP', dataIndex: 'ip', width: 150 },
  ]
  return <section className="admin-page">
    <div className="admin-page-heading"><div><Typography.Title level={2}>{titles[kind]}</Typography.Title><Typography.Text type="secondary">保留最近 30 天。{kind === 'login' ? '包含前后台密码登录和单点登录。' : kind === 'operation' ? '记录后台写操作的结果，不保存请求正文。' : '记录 HTTP 5xx 或耗时 ≥ 1 秒的 API 请求，排除 SSE、健康检查和监控查询。'}</Typography.Text></div><Button onClick={() => { setLoading(true); setError(''); setReload(n => n + 1) }} loading={loading}>刷新</Button></div>
    <Space wrap style={{ marginBottom: 20 }}>
      <Input.Search allowClear placeholder="精确搜索账号或 IP" onSearch={q => search({ q: q.trim() })} style={{ width: 250 }} />
      <Select aria-label="入口筛选" placeholder="全部入口" allowClear style={{ width: 120 }} options={[{ value: 'front', label: '前台' }, { value: 'admin', label: '后台' }]} onChange={scope => search({ scope })} />
      <Select aria-label="结果筛选" placeholder="全部结果" allowClear style={{ width: 120 }} options={[{ value: 'success', label: '成功' }, { value: 'failure', label: '失败' }]} onChange={result => search({ result })} />
      <DatePicker.RangePicker showTime onChange={range => search({ from: range?.[0]?.toISOString(), to: range?.[1]?.toISOString() })} />
    </Space>
    {error && <Alert type="error" showIcon title={error} style={{ marginBottom: 16 }} />}
    <Table<MonitorLog> loading={loading} columns={columns} dataSource={error ? [] : data.items} rowKey="id" scroll={{ x: 1150 }} expandable={{ expandedRowRender: row => <Space orientation="vertical"><Typography.Text>用户 ID：{row.userId || '未识别'}</Typography.Text><Typography.Text>客户端：{row.userAgent || '未提供'}</Typography.Text></Space> }} pagination={{ current: filter.page, pageSize: 20, total: Math.min(data.total, 10000), showSizeChanger: false, onChange: page => { setLoading(true); setError(''); setFilter(current => ({ ...current, page })) }, showTotal: total => `共 ${data.total} 条${total < data.total ? '，请缩小时间范围查看后续记录' : ''}` }} />
  </section>
}
