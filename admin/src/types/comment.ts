export type Comment = {
  id: number
  postId: number
  postTitle: string
  userId: number | null
  authorName: string
  parentId: number | null
  body: string
  status: 'pending' | 'approved' | 'rejected'
  createdAt: string
}

export type CommentList = { items: Comment[]; total: number; page: number; pageSize: number }
