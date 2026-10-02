import type { Page } from "../types/page";
import type { Post } from "../types/content";
import { contentLabel, contentPath } from "./content-path.ts";

export type SearchPreviewItem = {
  key: string;
  title: string;
  label: string;
  href: string;
  excerpt: string;
  date: string;
};

export function searchPreview(posts: Post[], pages: Page[]): SearchPreviewItem[] {
  return [
    ...posts.map((post) => ({ key: `post-${post.id}`, title: post.title, label: contentLabel(post.kind), href: contentPath(post.kind, post.slug), excerpt: post.excerpt, date: post.publishedAt ?? post.createdAt })),
    ...pages.map((page) => ({ key: `page-${page.id}`, title: page.title, label: "页面", href: `/pages/${encodeURIComponent(page.slug)}`, excerpt: page.description, date: page.publishedAt ?? page.createdAt })),
  ].sort((a, b) => Date.parse(b.date) - Date.parse(a.date)).slice(0, 8);
}
