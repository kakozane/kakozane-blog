import ArticleDetail from "../../modules/articles/pages/article-detail";
import { articleMeta } from "../../modules/articles/lib/article-meta";
import { commentPageFromSearch, getComments } from "../../modules/comments/api/comments.server";
import { getLikes } from "../../modules/likes/api/likes.server";
import { getPostConnections, getThought } from "../../modules/articles/api/posts.server";
import type { Route } from "./+types/thought";

export async function loader({ params, request }: Route.LoaderArgs) {
  const page = await commentPageFromSearch(params.slug, "thought", new URL(request.url).searchParams);
  const [post, comments, connections, likes] = await Promise.all([
    getThought(params.slug), getComments(params.slug, page, "thought"), getPostConnections(params.slug, "thought"), getLikes(params.slug, "thought"),
  ]);
  return { post, comments, likes, more: connections.items, previous: connections.previous, next: connections.next };
}

export function meta({ loaderData, matches }: Route.MetaArgs) {
  const site = matches[0].loaderData.site;
  if (!loaderData) return [{ title: `文章不存在 · ${site.title}` }];
  return articleMeta(loaderData.post, site);
}

export default function Thought({ loaderData }: Route.ComponentProps) {
  return <ArticleDetail data={loaderData} />;
}
