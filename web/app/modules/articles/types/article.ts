import type { CommentList } from "../../comments/types/comment";
import type { LikeState } from "../../likes/types/like";
import type { Paginated } from "../../../shared/types/api";
import type { Term } from "./taxonomy";

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
export type PostList = Paginated<Post>;
export type PublicationStats = { posts: number; notes: number; thoughts: number; firstPublishedAt: string | null };
export type PostLink = Pick<Post, "id" | "title" | "slug">;
export type PostConnections = { items: Post[]; previous: PostLink | null; next: PostLink | null };
export type TimelineYears = { years: number[] };
export type MonthCount = { month: string; count: number };

export type ArticleDetailData = { post: Post; comments: CommentList; likes: LikeState; more: Post[]; previous: PostLink | null; next: PostLink | null };
