import type { Post, RecentComment, RecentLike } from "../types/content";
import { contentPath } from "./content-path.ts";
import { markdownText } from "./reading-stats.ts";

export type HomeActivity =
  | { type: "publication"; id: number; at: string; post: Post }
  | { type: "comment"; id: number; at: string; comment: RecentComment }
  | { type: "like"; id: number; at: string; like: RecentLike };

export function homeActivity(posts: Post[], comments: RecentComment[], likes: RecentLike[]): HomeActivity[] {
  return [
    ...posts.map((post) => ({ type: "publication" as const, id: post.id, at: post.publishedAt ?? post.createdAt, post })),
    ...comments.map((comment) => ({ type: "comment" as const, id: comment.id, at: comment.createdAt, comment })),
    ...likes.map((like, id) => ({ type: "like" as const, id, at: like.createdAt, like })),
  ].sort((a, b) => Date.parse(b.at) - Date.parse(a.at) || b.id - a.id).slice(0, 6);
}

export function commentActivityHref(comment: RecentComment) {
  return `${contentPath(comment.kind, comment.slug)}?comment=${comment.id}#comment-${comment.id}`;
}

export function commentActivityPreview(body: string) {
  const text = Array.from(markdownText(body));
  return text.slice(0, 80).join("") + (text.length > 80 ? "…" : "");
}
