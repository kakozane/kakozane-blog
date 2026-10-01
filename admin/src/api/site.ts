import type { Site } from '../types/site'

async function read(response: Response): Promise<Site> {
  const data = (await response.json()) as Site & { error?: string }
  if (!response.ok) throw new Error(data.error ?? '站点设置读取失败')
  return data
}

export async function getSite(): Promise<Site> {
  return read(await fetch('/api/v1/site', { credentials: 'same-origin' }))
}

export async function updateSite(site: Site): Promise<Site> {
  return read(await fetch('/api/v1/admin/site', {
    method: 'PUT', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(site),
  }))
}
