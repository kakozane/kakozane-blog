import type { LikeState, RecentLike } from "../types/like";
import type { Post } from "../../articles/types/article";
import { contentPath } from "../../articles/lib/content-path.ts";
import { get } from "../../../shared/api/server.server.ts";

export function getLikes(slug: string, kind: Post["kind"]): Promise<LikeState> {
  return get<LikeState>(`${contentPath(kind, slug)}/likes`);
}

export async function getRecentLikes(): Promise<RecentLike[]> {
  return (await get<{ items: RecentLike[] }>("/activity/likes")).items;
}
