import type { Post } from "../types/content";

type Kind = Post["kind"];
const sections: Record<Kind, string> = { post: "posts", note: "notes", thought: "thinking" };
const labels: Record<Kind, string> = { post: "文章", note: "手记", thought: "思考" };

export function contentPath(kind: Kind, slug: string): string {
  return `/${sections[kind]}/${encodeURIComponent(slug)}`;
}

export function contentListPath(kind: Kind): string {
  return `/${sections[kind]}`;
}

export function contentLabel(kind: Kind): string { return labels[kind]; }
