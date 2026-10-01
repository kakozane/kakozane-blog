import type { AdminUser, AuthResponse, LoginInput } from '../types/auth'

const endpoint = '/api/v1/admin/auth'

export async function login(input: LoginInput): Promise<AdminUser> {
  const response = await fetch(`${endpoint}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'same-origin',
    body: JSON.stringify(input),
  })
  const data = (await response.json()) as AuthResponse
  if (!response.ok) throw new Error(data.error ?? '登录失败，请稍后重试')
  return data.user
}

export async function currentUser(): Promise<AdminUser | null> {
  const response = await fetch(`${endpoint}/me`, { credentials: 'same-origin' })
  if (response.status === 401) return null
  if (!response.ok) throw new Error('无法读取登录状态')
  const data = (await response.json()) as AuthResponse
  return data.user
}

export async function logout(): Promise<void> {
  const response = await fetch(`${endpoint}/logout`, {
    method: 'POST',
    credentials: 'same-origin',
  })
  if (!response.ok) throw new Error('退出失败，请稍后重试')
}
