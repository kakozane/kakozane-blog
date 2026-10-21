export type LogKind = 'login' | 'operation' | 'request'
export type MonitorLog = {
  id: number; kind: LogKind; scope: string; userId: number; username: string
  method: string; route: string; targetId: string; status: number
  durationMs: number; ip: string; userAgent: string; createdAt: string
}
export type LogFilter = { kind: LogKind; page: number; scope?: string; result?: string; q?: string; from?: string; to?: string }
export type Metric = { key: string; label: string; value: number; unit: string }
export type ComponentMetrics = { status: 'pending' | 'ok' | 'partial' | 'error'; message?: string; metrics: Metric[] | null }
export type RouteMetric = { method: string; route: string; requests: number; errors: number; clientErrors: number; slow: number; averageMs: number; maxMs: number }
export type MonitorSnapshot = {
  sampledAt: string; startedAt: string; server: ComponentMetrics; mysql: ComponentMetrics; redis: ComponentMetrics
  routes: RouteMetric[]; history: { at: string; requests: number; errors: number; cpu?: number; memory?: number }[]
  droppedLogs: number; failedLogs: number; cleanupFailed: boolean; queueDepth: number
}
