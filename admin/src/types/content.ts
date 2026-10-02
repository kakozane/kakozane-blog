export type Term = { id: number; name: string; slug: string }

export type Post = {
  id: number
  kind: 'post' | 'note' | 'thought'
  authorId: number
  authorName: string
  categoryId: number | null
  categoryName: string
  categorySlug: string
  title: string
  slug: string
  excerpt: string
  contentMd?: string
  coverUrl: string
  status: 'draft' | 'published'
  pinned: boolean
  tags: Term[]
  publishedAt: string | null
  createdAt: string
  updatedAt: string
}

export type PostInput = {
  kind: 'post' | 'note' | 'thought'
  title: string
  slug: string
  excerpt: string
  contentMd: string
  coverUrl: string
  status: 'draft' | 'published'
  pinned: boolean
  categoryId: number | null
  tagIds: number[]
}

export type PostList = { items: Post[]; total: number; page: number; pageSize: number }
