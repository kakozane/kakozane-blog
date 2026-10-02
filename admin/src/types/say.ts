export type Say = {
  id: number
  text: string
  source: string
  author: string
  visible: boolean
  createdAt: string
  updatedAt: string
}

export type SayInput = Pick<Say, 'text' | 'source' | 'author' | 'visible'>
export type SayList = { items: Say[]; total: number; page: number; pageSize: number }
