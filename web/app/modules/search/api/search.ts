import type { SearchResult } from "../types/search";
import type { PostList } from "../../articles/types/article";
import type { Page } from "../../pages/types/page";

export async function searchContent(term: string, signal: AbortSignal): Promise<SearchResult> {
  const params = new URLSearchParams({ q: term });
  const [postResponse, pageResponse] = await Promise.all([
    fetch(`/api/v1/timeline?${params}&pageSize=8`, { signal }),
    fetch(`/api/v1/pages?${params}`, { signal }),
  ]);
  if (!postResponse.ok || !pageResponse.ok) throw new Error("搜索失败");
  const [posts, pages] = await Promise.all([
    postResponse.json() as Promise<PostList>,
    pageResponse.json() as Promise<{ items: Page[] }>,
  ]);
  return { posts, pages };
}
