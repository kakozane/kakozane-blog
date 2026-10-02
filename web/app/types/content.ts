export type Term = { id: number; name: string; slug: string };
export type NoteSeries = Term & { count: number };

export type Post = {
  id: number;
  kind: "post" | "note" | "thought";
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
  pinned: boolean;
  tags: Term[];
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type PostList = { items: Post[]; total: number; page: number; pageSize: number };
export type PublicationStats = { posts: number; notes: number; thoughts: number; firstPublishedAt: string | null };
export type PostLink = Pick<Post, "id" | "title" | "slug">;
export type PostConnections = { items: Post[]; previous: PostLink | null; next: PostLink | null };
export type TimelineYears = { years: number[] };
export type MonthCount = { month: string; count: number };
export type LikeState = { count: number; liked: boolean };

export type Comment = {
  id: number;
  postId: number;
  userId: number | null;
  authorName: string;
  parentId: number | null;
  parentAuthorName?: string;
  body: string;
  status: "pending" | "approved" | "rejected";
  pinned: boolean;
  createdAt: string;
};

export type CommentList = { items: Comment[]; total: number; page: number; pageSize: number };

export type RecentComment = {
  id: number;
  kind: Post["kind"];
  slug: string;
  title: string;
  authorName: string;
  body: string;
  createdAt: string;
};

export type RecentLike = {
  kind: Post["kind"];
  slug: string;
  title: string;
  createdAt: string;
};

export type LikedPost = {
  kind: Post["kind"];
  slug: string;
  title: string;
  likedAt: string;
};

export type LikedPostList = { items: LikedPost[]; total: number; page: number; pageSize: number };
