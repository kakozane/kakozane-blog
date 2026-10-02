import type { Project, ProjectInput } from '../types/project'

const base = '/api/v1/admin/projects'

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    credentials: 'same-origin',
    ...options,
    headers: options?.body ? { 'Content-Type': 'application/json' } : undefined,
  })
  if (response.status === 204) return undefined as T
  const data = (await response.json()) as T & { error?: string }
  if (!response.ok) throw new Error(data.error ?? '项目请求失败')
  return data
}

export async function listProjects(): Promise<Project[]> {
  return (await request<{ items: Project[] }>(base)).items
}

export function saveProject(input: ProjectInput, id?: number): Promise<Project> {
  return request<Project>(id ? `${base}/${id}` : base, {
    method: id ? 'PUT' : 'POST', body: JSON.stringify(input),
  })
}

export function deleteProject(id: number): Promise<void> {
  return request<void>(`${base}/${id}`, { method: 'DELETE' })
}
