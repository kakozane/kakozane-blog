export type Media = {
  id: number
  url: string
  mimeType: string
  sizeBytes: number
  width: number
  height: number
  createdAt: string
}

export type MediaList = { items: Media[]; total: number; page: number; pageSize: number }
