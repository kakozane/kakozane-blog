import { getPosts, getTags } from "../api/posts.server";
import { postSort, postView } from "../lib/posts-options";

export async function loadPosts({ request }: { request: Request }) {
  const search = new URL(request.url).searchParams;
  const query = Array.from((search.get("q") ?? "").trim()).slice(0, 100).join("");
  const requestedPage = Number(search.get("page") ?? 1);
  const page = Number.isSafeInteger(requestedPage) && requestedPage > 0 && requestedPage <= 100000 ? requestedPage : 1;
  const view = postView(search.get("view"));
  const sort = postSort(search.get("sort"));
  const params = new URLSearchParams({ page: String(page), pageSize: "12" });
  if (query) params.set("q", query);
  if (sort !== "newest") params.set("sort", sort);
  const [posts, tags] = await Promise.all([getPosts(params), getTags()]);
  return { posts, tags, query, view, sort };
}
