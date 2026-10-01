import type { Media, MediaList } from '../types/media'

async function responseData<T>(response: Response): Promise<T> {
  if (response.status === 204) return undefined as T
  const data = (await response.json()) as T & { error?: string }
  if (!response.ok) throw new Error(data.error ?? '请求失败')
  return data
}

export async function listMedia(page = 1): Promise<MediaList> {
  return responseData<MediaList>(await fetch(`/api/v1/admin/media?page=${page}`, { credentials: 'same-origin' }))
}

export async function uploadMedia(file: Blob): Promise<Media> {
  const body = new FormData()
  body.append('file', file)
  return responseData<Media>(await fetch('/api/v1/admin/media', { method: 'POST', body, credentials: 'same-origin' }))
}

export async function deleteMedia(id: number): Promise<void> {
  await responseData<void>(await fetch(`/api/v1/admin/media/${id}`, { method: 'DELETE', credentials: 'same-origin' }))
}
