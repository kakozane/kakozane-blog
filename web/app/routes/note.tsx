import Post from "./post";
import { articleMeta } from "../lib/article-meta";
import { commentPageFromSearch, getComments, getLikes, getNote, getPostConnections } from "../lib/posts.server";
import type { Route } from "./+types/note";

export async function loader({ params, request }: Route.LoaderArgs) {
  const page = await commentPageFromSearch(params.slug, "note", new URL(request.url).searchParams);
  const [post, comments, connections, likes] = await Promise.all([
    getNote(params.slug), getComments(params.slug, page, "note"), getPostConnections(params.slug, "note"), getLikes(params.slug, "note"),
  ]);
  return { post, comments, likes, more: connections.items, previous: connections.previous, next: connections.next };
}

export function meta({ loaderData, matches }: Route.MetaArgs) {
  const site = matches[0].loaderData.site;
  if (!loaderData) return [{ title: `手记不存在 · ${site.title}` }];
  return articleMeta(loaderData.post, site);
}

export default Post;
