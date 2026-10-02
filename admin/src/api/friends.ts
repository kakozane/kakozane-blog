import type { FriendInput, FriendLink } from '../types/friend'

const base = '/api/v1/admin/friends'

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    credentials: 'same-origin',
    ...options,
    headers: options?.body ? { 'Content-Type': 'application/json' } : undefined,
  })
  if (response.status === 204) return undefined as T
  const data = (await response.json()) as T & { error?: string }
  if (!response.ok) throw new Error(data.error ?? '友情链接请求失败')
  return data
}

export async function listFriends(): Promise<FriendLink[]> {
  return (await request<{ items: FriendLink[] }>(base)).items
}

export function saveFriend(input: FriendInput, id?: number): Promise<FriendLink> {
  return request<FriendLink>(id ? `${base}/${id}` : base, {
    method: id ? 'PUT' : 'POST', body: JSON.stringify(input),
  })
}

export function deleteFriend(id: number): Promise<void> {
  return request<void>(`${base}/${id}`, { method: 'DELETE' })
}
