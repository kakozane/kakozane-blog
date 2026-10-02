import { useLoaderData } from "react-router";

import { TaxonomyPage } from "../components/taxonomy-page";
import { listingMeta } from "../lib/listing-meta";
import { getCategories, getTaxonomyPosts } from "../lib/posts.server";
import type { Route } from "./+types/category";

export function meta({ loaderData, matches }: Route.MetaArgs) {
  const site = matches[0].loaderData.site;
  if (!loaderData) return [{ title: `分类不存在 · ${site.title}` }];
  return listingMeta(site, `${loaderData.term.name} · 分类`, `${loaderData.term.name}分类下的文章、手记与思考。`, `/categories/${encodeURIComponent(loaderData.term.slug)}`, loaderData.results.page);
}

export async function loader({ params, request }: Route.LoaderArgs) {
  const term = (await getCategories()).find((item) => item.slug === params.slug);
  if (!term) throw new Response("分类不存在", { status: 404 });
  const page = new URL(request.url).searchParams.get("page") ?? "1";
  const results = await getTaxonomyPosts("category", term.slug, page);
  return { term, results };
}

export default function Category() {
  const { term, results } = useLoaderData<typeof loader>();
  return <TaxonomyPage base={`/categories/${encodeURIComponent(term.slug)}`} label="分类" results={results} term={term} />;
}
