import { getPosts, getPublicationStats, getTimeline, getTimelineMonths } from "../../articles/api/posts.server";
import { getRecentComments } from "../../comments/api/comments.server";
import { getRecentLikes } from "../../likes/api/likes.server";
import { homeActivity } from "../lib/home-activity";

export async function loadHome({ request }: { request: Request }) {
  const params = new URL(request.url).searchParams;
  const [posts, published, comments, likes, months, stats] = await Promise.all([getPosts(params, true), getTimeline(new URLSearchParams(), 6), getRecentComments().catch(() => []), getRecentLikes().catch(() => []), getTimelineMonths(), getPublicationStats().catch(() => ({ posts: 0, notes: 0, thoughts: 0, firstPublishedAt: null }))]);
  return { posts, activity: homeActivity(published.items, comments, likes), months, stats, query: params.get("q") ?? "", category: params.get("category") ?? "", tag: params.get("tag") ?? "" };
}
