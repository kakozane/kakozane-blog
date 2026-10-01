export interface LoginInput {
  username: string
  password: string
}

export interface AdminUser {
  id: number
  username: string
  displayName: string
  role: 'admin'
  permissions: string[]
}

export interface AuthResponse {
  user: AdminUser
  error?: string
}
