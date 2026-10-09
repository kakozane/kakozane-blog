import { getTags, getTaxonomyPosts } from "../api/posts.server";

export async function loadTag({ params, request }: { request: Request; params: { slug: string } }) {
  const term = (await getTags()).find((item) => item.slug === params.slug);
  if (!term) throw new Response("标签不存在", { status: 404 });
  const page = new URL(request.url).searchParams.get("page") ?? "1";
  const results = await getTaxonomyPosts("tag", term.slug, page);
  return { term, results };
}
