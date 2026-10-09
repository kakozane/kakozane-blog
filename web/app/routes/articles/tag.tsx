import { listingMeta } from "../../modules/site/lib/listing-meta";
import type { Route } from "./+types/tag";

export function meta({ loaderData, matches }: Route.MetaArgs) {
  const site = matches[0].loaderData.site;
  if (!loaderData) return [{ title: `标签不存在 · ${site.title}` }];
  return listingMeta(site, `${loaderData.term.name} · 标签`, `带有 ${loaderData.term.name} 标签的文章。`, `/tags/${encodeURIComponent(loaderData.term.slug)}`, loaderData.results.page);
}


export { loadTag as loader } from "../../modules/articles/loaders/tag.server";

export { default } from "../../modules/articles/pages/tag";
