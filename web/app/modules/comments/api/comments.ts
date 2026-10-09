import type { ApiError } from "../../../shared/types/api";
import type { Post } from "../../articles/types/article";
import type { Comment, CommentInput, CommentList, CommentLocation } from "../types/comment";
import { contentPath } from "../../articles/lib/content-path.ts";

export async function myComments(kind: Post["kind"], slug: string): Promise<CommentList> {
  const response = await fetch(`/api/v1${contentPath(kind, slug)}/comments/mine`, { credentials: "same-origin" });
  if (!response.ok) throw new Error("暂时无法读取你的待审核评论");
  return response.json() as Promise<CommentList>;
}

export async function saveComment(kind: Post["kind"], slug: string, input: CommentInput, id?: number): Promise<Comment> {
  const endpoint = `/api/v1${contentPath(kind, slug)}/comments`;
  const response = await fetch(id === undefined ? endpoint : `${endpoint}/${id}`, {
    method: id === undefined ? "POST" : "PUT", headers: { "Content-Type": "application/json" }, credentials: "same-origin",
    body: JSON.stringify(input),
  });
  if (!response.ok) {
    const data = await response.json() as ApiError;
    throw new Error(data.error ?? "提交失败");
  }
  return response.json() as Promise<Comment>;
}

export async function commentLocation(kind: Post["kind"], slug: string, id: number): Promise<CommentLocation> {
  const response = await fetch(`/api/v1${contentPath(kind, slug)}/comments/${id}/location`);
  if (!response.ok) throw new Error("这条回复已不可见");
  return response.json() as Promise<CommentLocation>;
}
