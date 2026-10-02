import type { Page } from "../types/page";

const api = process.env.API_INTERNAL_URL ?? "http://localhost:6324";

export async function getPages(query = ""): Promise<Page[]> {
  const response = await fetch(`${api}/api/v1/pages${query ? `?q=${encodeURIComponent(query)}` : ""}`);
  if (!response.ok) throw new Response("暂时无法读取页面", { status: 503 });
  return ((await response.json()) as { items: Page[] }).items;
}

export async function getPage(slug: string): Promise<Page> {
  const response = await fetch(`${api}/api/v1/pages/${encodeURIComponent(slug)}`);
  if (response.status === 404) throw new Response("页面不存在", { status: 404 });
  if (!response.ok) throw new Response("暂时无法读取页面", { status: 503 });
  return (await response.json()) as Page;
}
