import type { Say, SayInput, SayList } from '../types/say'

const base = '/api/v1/admin/says'

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    credentials: 'same-origin',
    ...options,
    headers: options?.body ? { 'Content-Type': 'application/json' } : undefined,
  })
  if (response.status === 204) return undefined as T
  const data = (await response.json()) as T & { error?: string }
  if (!response.ok) throw new Error(data.error ?? '一言请求失败')
  return data
}

export function listSays(page: number): Promise<SayList> {
  return request<SayList>(`${base}?page=${page}`)
}

export function saveSay(input: SayInput, id?: number): Promise<Say> {
  return request<Say>(id ? `${base}/${id}` : base, {
    method: id ? 'PUT' : 'POST', body: JSON.stringify(input),
  })
}

export function deleteSay(id: number): Promise<void> {
  return request<void>(`${base}/${id}`, { method: 'DELETE' })
}
