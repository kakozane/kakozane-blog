export type Term = { id: number; name: string; slug: string };

export type Post = {
  id: number;
  authorId: number;
  authorName: string;
  categoryId: number | null;
  categoryName: string;
  categorySlug: string;
  title: string;
  slug: string;
  excerpt: string;
  contentMd?: string;
  coverUrl: string;
  status: "draft" | "published";
  tags: Term[];
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type PostList = { items: Post[]; total: number; page: number; pageSize: number };

export type Comment = {
  id: number;
  postId: number;
  userId: number | null;
  authorName: string;
  parentId: number | null;
  body: string;
  status: "pending" | "approved" | "rejected";
  createdAt: string;
};

export type CommentList = { items: Comment[]; total: number; page: number; pageSize: number };
