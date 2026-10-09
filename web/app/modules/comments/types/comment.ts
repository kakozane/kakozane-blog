import type { Paginated } from "../../../shared/types/api";
import type { Post } from "../../articles/types/article";

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
export type CommentList = Paginated<Comment>;
export type RecentComment = {
  id: number;
  kind: Post["kind"];
  slug: string;
  title: string;
  authorName: string;
  body: string;
  createdAt: string;
};

export type CommentInput = { body: string; parentId?: number | null };
export type CommentLocation = { page: number };
