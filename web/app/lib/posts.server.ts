import type { CommentList, Post, PostList, Term } from "../types/content";

const api = process.env.API_INTERNAL_URL ?? "http://localhost:6324";

async function get<T>(path: string): Promise<T> {
  const response = await fetch(`${api}/api/v1${path}`);
  if (response.status === 404) throw new Response("文章不存在", { status: 404 });
  if (!response.ok) throw new Response("暂时无法读取文章", { status: 503 });
  return (await response.json()) as T;
}

export function getPosts(params: URLSearchParams): Promise<PostList> {
  const query = new URLSearchParams();
  for (const key of ["page", "pageSize", "q", "category", "tag"]) {
    const value = params.get(key);
    if (value) query.set(key, value);
  }
  return get<PostList>(`/posts?${query}`);
}

export function getPost(slug: string): Promise<Post> {
  return get<Post>(`/posts/${encodeURIComponent(slug)}`);
}

export async function getCategories(): Promise<Term[]> {
  return (await get<{ items: Term[] }>("/categories")).items;
}

export function getComments(slug: string, page: number): Promise<CommentList> {
  return get<CommentList>(`/posts/${encodeURIComponent(slug)}/comments?page=${page}`);
}
