import { getCategories, getTaxonomyPosts } from "../api/posts.server";

export async function loadCategory({ params, request }: { request: Request; params: { slug: string } }) {
  const term = (await getCategories()).find((item) => item.slug === params.slug);
  if (!term) throw new Response("分类不存在", { status: 404 });
  const page = new URL(request.url).searchParams.get("page") ?? "1";
  const results = await getTaxonomyPosts("category", term.slug, page);
  return { term, results };
}
