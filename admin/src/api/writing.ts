import type { PostInput } from '../types/content'
import { request } from './content'
export type Draft = { key: string; version: number; snapshot: PostInput; updatedAt: string }
export type Revision = { id: number; snapshot: PostInput; createdAt: string }
const base = '/api/v1/admin'
export const getDraft = (key: string) => request<Draft>(`${base}/drafts/${key}`)
export const putDraft = (key: string, version: number, snapshot: PostInput) => request<Draft>(`${base}/drafts/${key}`, { method: 'PUT', body: JSON.stringify({ version, snapshot }) })
export const removeDraft = (key: string, version: number) => request<void>(`${base}/drafts/${key}?version=${version}`, { method: 'DELETE' })
export const revisions = async (id: number) => (await request<{ items: Revision[] }>(`${base}/posts/${id}/revisions`)).items
export const restorePost = (id: number) => request<void>(`${base}/posts/${id}/restore`, { method: 'POST' })
export const purgePost = (id: number) => request<void>(`${base}/posts/${id}/purge`, { method: 'DELETE' })
