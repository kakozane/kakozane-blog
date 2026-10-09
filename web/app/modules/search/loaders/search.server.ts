import { getPages } from "../../pages/api/pages.server";
import { getTimeline } from "../../articles/api/posts.server";

export async function loadSearch({ request }: { request: Request }) {
  const params = new URL(request.url).searchParams;
  const query = Array.from((params.get("q") ?? "").trim()).slice(0, 100).join("");
  const [results, pages] = query ? await Promise.all([
    getTimeline(new URLSearchParams({ q: query, page: params.get("page") ?? "1" })), getPages(query),
  ]) : [{ items: [], total: 0, page: 1, pageSize: 50 }, []];
  return { query, results, pages };
}
