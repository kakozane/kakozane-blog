import { useLoaderData } from "react-router";

import { TaxonomyPage } from "../components/taxonomy-page";
import { listingMeta } from "../lib/listing-meta";
import { getTags, getTaxonomyPosts } from "../lib/posts.server";
import type { Route } from "./+types/tag";

export function meta({ loaderData, matches }: Route.MetaArgs) {
  const site = matches[0].loaderData.site;
  if (!loaderData) return [{ title: `标签不存在 · ${site.title}` }];
  return listingMeta(site, `${loaderData.term.name} · 标签`, `带有 ${loaderData.term.name} 标签的文章、手记与思考。`, `/tags/${encodeURIComponent(loaderData.term.slug)}`, loaderData.results.page);
}

export async function loader({ params, request }: Route.LoaderArgs) {
  const term = (await getTags()).find((item) => item.slug === params.slug);
  if (!term) throw new Response("标签不存在", { status: 404 });
  const page = new URL(request.url).searchParams.get("page") ?? "1";
  const results = await getTaxonomyPosts("tag", term.slug, page);
  return { term, results };
}

export default function Tag() {
  const { term, results } = useLoaderData<typeof loader>();
  return <TaxonomyPage base={`/tags/${encodeURIComponent(term.slug)}`} label="标签" results={results} term={term} />;
}
