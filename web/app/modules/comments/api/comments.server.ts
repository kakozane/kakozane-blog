import type { CommentList, RecentComment } from "../types/comment";
import type { Post } from "../../articles/types/article";
import { contentPath } from "../../articles/lib/content-path.ts";
import { api, get } from "../../../shared/api/server.server.ts";

export function getComments(slug: string, page: number, kind: Post["kind"] = "post"): Promise<CommentList> {
  return get<CommentList>(`${contentPath(kind, slug)}/comments?page=${page}`);
}

export async function commentPageFromSearch(slug: string, kind: Post["kind"], search: URLSearchParams): Promise<number> {
  const id = Number(search.get("comment"));
  if (search.has("comment") && Number.isSafeInteger(id) && id > 0) {
    const response = await fetch(`${api}/api/v1${contentPath(kind, slug)}/comments/${id}/location`);
    if (response.status === 404) return 1;
    if (!response.ok) throw new Response("暂时无法定位评论", { status: 503 });
    return ((await response.json()) as { page: number }).page;
  }
  return Number(search.get("commentsPage") ?? 1) || 1;
}

export async function getRecentComments(): Promise<RecentComment[]> {
  return (await get<{ items: RecentComment[] }>("/activity/comments")).items;
}
