import { getTimeline, getTimelineYears } from "../api/posts.server";

export async function loadArchive({ request }: { request: Request }) {
  const params = new URL(request.url).searchParams;
  const query = new URLSearchParams(params);
  query.delete("kind");
  query.delete("featured");
  const [items, years] = await Promise.all([getTimeline(query), getTimelineYears()]);
  return { items, years: years.years, year: params.get("year") ?? "", month: params.get("month") ?? "" };
}
