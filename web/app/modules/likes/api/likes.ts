import type { Post } from "../../articles/types/article";
import type { LikeState } from "../types/like";
import { contentPath } from "../../articles/lib/content-path.ts";

export async function currentLikes(kind: Post["kind"], slug: string): Promise<LikeState | null> {
  const response = await fetch(`/api/v1${contentPath(kind, slug)}/likes`, { credentials: "same-origin" });
  return response.ok ? response.json() as Promise<LikeState> : null;
}

export async function setLiked(kind: Post["kind"], slug: string, liked: boolean): Promise<LikeState> {
  const response = await fetch(`/api/v1${contentPath(kind, slug)}/likes`, { method: liked ? "PUT" : "DELETE", credentials: "same-origin" });
  if (!response.ok) throw new Error(response.status === 401 ? "请重新登录后点赞" : "暂时无法更新点赞");
  return response.json() as Promise<LikeState>;
}
