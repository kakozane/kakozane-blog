import type { User, UserInput, UserList, UserUpdate } from '../types/user'

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    credentials: 'same-origin', ...options,
    headers: options?.body ? { 'Content-Type': 'application/json' } : undefined,
  })
  if (response.status === 204) return undefined as T
  const data = (await response.json()) as T & { error?: string }
  if (!response.ok) throw new Error(data.error ?? '请求失败')
  return data
}

export function listUsers(page = 1, q = ''): Promise<UserList> {
  const params = new URLSearchParams({ page: String(page), pageSize: '10' })
  if (q) params.set('q', q)
  return request<UserList>(`/api/v1/admin/users?${params}`)
}

export function createUser(input: UserInput): Promise<User> {
  return request<User>('/api/v1/admin/users', { method: 'POST', body: JSON.stringify(input) })
}

export function updateUser(id: number, input: UserUpdate): Promise<User> {
  return request<User>(`/api/v1/admin/users/${id}`, { method: 'PUT', body: JSON.stringify(input) })
}

export function resetPassword(id: number): Promise<{ password: string }> {
  return request<{ password: string }>(`/api/v1/admin/users/${id}/reset-password`, { method: 'POST' })
}

export function deleteUser(id: number): Promise<void> {
  return request<void>(`/api/v1/admin/users/${id}`, { method: 'DELETE' })
}

export function updateProfile(displayName: string): Promise<void> {
  return request<void>('/api/v1/admin/auth/profile', { method: 'PUT', body: JSON.stringify({ displayName }) })
}

export function changePassword(oldPassword: string, newPassword: string): Promise<void> {
  return request<void>('/api/v1/admin/auth/change-password', { method: 'POST', body: JSON.stringify({ oldPassword, newPassword }) })
}
