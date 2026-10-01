import type { Comment, CommentList } from '../types/comment'

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(path, { credentials: 'same-origin', ...options, headers: options?.body ? { 'Content-Type': 'application/json' } : undefined })
  if (response.status === 204) return undefined as T
  const data = (await response.json()) as T & { error?: string }
  if (!response.ok) throw new Error(data.error ?? '请求失败')
  return data
}

export function listComments(page = 1, status = ''): Promise<CommentList> {
  const params = new URLSearchParams({ page: String(page) })
  if (status) params.set('status', status)
  return request<CommentList>(`/api/v1/admin/comments?${params}`)
}

export function setCommentStatus(id: number, status: Comment['status']): Promise<Comment> {
  return request<Comment>(`/api/v1/admin/comments/${id}/status`, { method: 'PUT', body: JSON.stringify({ status }) })
}

export function deleteComment(id: number): Promise<void> {
  return request<void>(`/api/v1/admin/comments/${id}`, { method: 'DELETE' })
}
