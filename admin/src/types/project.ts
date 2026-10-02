export type Project = {
  id: number
  name: string
  url: string
  description: string
  avatarUrl: string
  sortOrder: number
  visible: boolean
}

export type ProjectInput = Omit<Project, 'id'>
