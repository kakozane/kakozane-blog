export type User = {
  id: number
  username: string
  displayName: string
  role: 'admin' | 'reader'
  status: 'active' | 'disabled'
  createdAt: string
  updatedAt: string
}

export type UserInput = { username: string; displayName: string; password: string; role: User['role'] }
export type UserUpdate = Pick<User, 'displayName' | 'role' | 'status'>
export type UserList = { items: User[]; total: number; page: number; pageSize: number }
