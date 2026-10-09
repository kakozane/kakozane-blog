import type { MonthCount, Post, PostConnections, PostList, PublicationStats, TimelineYears } from "../types/article";
import type { NoteSeries, Term } from "../types/taxonomy";
import { contentPath } from "../lib/content-path.ts";

import { get } from "../../../shared/api/server.server.ts";

export function getPosts(params: URLSearchParams, pinnedFirst = false): Promise<PostList> {
  const query = new URLSearchParams();
  for (const key of ["page", "pageSize", "q", "category", "tag"]) {
    const value = params.get(key);
    if (value) query.set(key, value);
  }
  const sort = params.get("sort");
  if (!pinnedFirst && sort) query.set("sort", sort);
  if (pinnedFirst) query.set("pinFirst", "1");
  return get<PostList>(`/timeline?${query}`);
}

export function getPublicationStats(): Promise<PublicationStats> {
  return get<PublicationStats>("/site/stats");
}

export function getPost(slug: string): Promise<Post> {
  return get<Post>(`/posts/${encodeURIComponent(slug)}`);
}

export function getPostConnections(slug: string, kind: Post["kind"]): Promise<PostConnections> {
  return get<PostConnections>(`${contentPath(kind, slug)}/related`);
}

export function getNotes(page: number, category?: string, featured = false): Promise<PostList> {
  const query = new URLSearchParams({ page: String(page), pageSize: "12" });
  if (category) query.set("category", category);
  if (featured) query.set("featured", "1");
  return get<PostList>(`/notes?${query}`);
}

export async function getNoteSeries(): Promise<NoteSeries[]> {
  return (await get<{ items: NoteSeries[] }>("/notes/series")).items;
}

export function getNote(slug: string): Promise<Post> {
  return get<Post>(`/notes/${encodeURIComponent(slug)}`);
}

export function getThoughts(page: number): Promise<PostList> {
  return get<PostList>(`/thinking?page=${page}&pageSize=12`);
}

export function getThought(slug: string): Promise<Post> {
  return get<Post>(contentPath("thought", slug));
}

export function getTimeline(params: URLSearchParams, pageSize = 50): Promise<PostList> {
  const query = new URLSearchParams({ pageSize: String(pageSize) });
  for (const key of ["page", "year", "month", "kind", "q", "featured"]) {
    const value = params.get(key);
    if (value) query.set(key, value);
  }
  return get<PostList>(`/timeline?${query}`);
}

export function getTaxonomyPosts(filter: "category" | "tag", slug: string, page: string): Promise<PostList> {
  const query = new URLSearchParams({ pageSize: "20", page, [filter]: slug });
  return get<PostList>(`/timeline?${query}`);
}

export function getTimelineYears(featured = false): Promise<TimelineYears> {
  return get<TimelineYears>(`/timeline/years${featured ? "?featured=1" : ""}`);
}

export async function getTimelineMonths(): Promise<MonthCount[]> {
  return (await get<{ months: MonthCount[] }>("/timeline/months")).months;
}

export async function getCategories(): Promise<Term[]> {
  return (await get<{ items: Term[] }>("/categories")).items;
}

export async function getTags(): Promise<Term[]> {
  return (await get<{ items: Term[] }>("/tags")).items;
}
