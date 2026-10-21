import type { LogFilter, MonitorLog, MonitorSnapshot } from '../types/monitor'

async function get<T>(path: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch(`/api/v1/admin/monitor/${path}`, { credentials: 'same-origin', signal, cache: 'no-store' })
  const data = await response.json() as T & { error?: string }
  if (!response.ok) throw new Error(data.error ?? '监控信息加载失败')
  return data
}
export function getMonitor(signal?: AbortSignal) { return get<MonitorSnapshot>('overview', signal) }
export function getMonitorLogs(filter: LogFilter, signal?: AbortSignal) {
  const query = new URLSearchParams({ pageSize: '20' })
  for (const [key, value] of Object.entries(filter)) if (value !== undefined && value !== '') query.set(key, String(value))
  return get<{ items: MonitorLog[]; total: number }>(`logs?${query}`, signal)
}
