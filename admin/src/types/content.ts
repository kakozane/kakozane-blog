export type Term = { id: number; name: string; slug: string }

export type Post = {
  id: number
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
  tags: Term[]
  publishedAt: string | null
  createdAt: string
  updatedAt: string
}

export type PostInput = {
  title: string
  slug: string
  excerpt: string
  contentMd: string
  coverUrl: string
  status: 'draft' | 'published'
  categoryId: number | null
  tagIds: number[]
}

export type PostList = { items: Post[]; total: number; page: number; pageSize: number }
