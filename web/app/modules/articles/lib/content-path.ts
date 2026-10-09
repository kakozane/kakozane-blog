import type { Post } from "../types/article";

type Kind = Post["kind"];
const sections: Record<Kind, string> = { post: "posts", note: "notes", thought: "thinking" };
const labels: Record<Kind, string> = { post: "文章", note: "文章", thought: "文章" };

export function contentPath(kind: Kind, slug: string): string {
  return `/${sections[kind]}/${encodeURIComponent(slug)}`;
}

export function contentListPath(_kind: Kind): string {
  return "/posts";
}

export function contentLabel(kind: Kind): string { return labels[kind]; }
