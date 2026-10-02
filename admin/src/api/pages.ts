import type { Page, PageInput } from '../types/page'

const base = '/api/v1/admin/pages'

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    credentials: 'same-origin',
    ...options,
    headers: options?.body ? { 'Content-Type': 'application/json' } : undefined,
  })
  if (response.status === 204) return undefined as T
  const data = (await response.json()) as T & { error?: string }
  if (!response.ok) throw new Error(data.error ?? '页面请求失败')
  return data
}

export async function listPages(): Promise<Page[]> {
  return (await request<{ items: Page[] }>(base)).items
}

export function getPage(id: number): Promise<Page> { return request<Page>(`${base}/${id}`) }

export function savePage(input: PageInput, id?: number): Promise<Page> {
  return request<Page>(id ? `${base}/${id}` : base, { method: id ? 'PUT' : 'POST', body: JSON.stringify(input) })
}

export function deletePage(id: number): Promise<void> {
  return request<void>(`${base}/${id}`, { method: 'DELETE' })
}
