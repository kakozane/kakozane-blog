export type PostView = "preview" | "compact";
export type PostSort = "newest" | "oldest" | "updated";

export function postView(value: string | null): PostView {
  return value === "compact" ? "compact" : "preview";
}

export function postSort(value: string | null): PostSort {
  return value === "oldest" || value === "updated" ? value : "newest";
}

export function postsHref(page: number, query: string, view: PostView, sort: PostSort): string {
  const params = new URLSearchParams();
  if (page > 1) params.set("page", String(page));
  if (query) params.set("q", query);
  if (view === "compact") params.set("view", "compact");
  if (sort !== "newest") params.set("sort", sort);
  return `/posts${params.size ? `?${params}` : ""}`;
}
