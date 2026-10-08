import type { Post, PostInput, PostList, Term } from '../types/content'

const adminApi = '/api/v1/admin'

export async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    credentials: 'same-origin',
    ...options,
    headers: options?.body ? { 'Content-Type': 'application/json', ...options.headers } : options?.headers,
  })
  if (response.status === 401) throw new Error('登录已过期，请重新登录')
  if (response.status === 204) return undefined as T
  const data = (await response.json()) as T & { error?: string }
  if (!response.ok) throw new Error(data.error ?? '请求失败，请稍后重试')
  return data
}

export function listPosts(page = 1, pageSize = 10, status = '', q = '', kind: Post['kind'] | 'all' = 'all'): Promise<PostList> {
  const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) })
  if (status) params.set('status', status)
  if (q) params.set('q', q)
  if (kind !== 'all') params.set('kind', kind)
  return request<PostList>(`${adminApi}/posts?${params}`)
}

export function getPost(id: number): Promise<Post> {
  return request<Post>(`${adminApi}/posts/${id}`)
}

export function savePost(input: PostInput, id?: number): Promise<Post> {
  return request<Post>(id ? `${adminApi}/posts/${id}` : `${adminApi}/posts`, {
    method: id ? 'PUT' : 'POST', body: JSON.stringify(input),
  })
}

export function deletePost(id: number): Promise<void> {
  return request<void>(`${adminApi}/posts/${id}`, { method: 'DELETE' })
}

export async function listTerms(kind: 'categories' | 'tags'): Promise<Term[]> {
  return (await request<{ items: Term[] }>(`${adminApi}/${kind}`)).items
}

export function saveTerm(kind: 'categories' | 'tags', input: Pick<Term, 'name' | 'slug'>, id?: number): Promise<Term> {
  return request<Term>(id ? `${adminApi}/${kind}/${id}` : `${adminApi}/${kind}`, {
    method: id ? 'PUT' : 'POST', body: JSON.stringify(input),
  })
}

export function deleteTerm(kind: 'categories' | 'tags', id: number): Promise<void> {
  return request<void>(`${adminApi}/${kind}/${id}`, { method: 'DELETE' })
}
