import { listingMeta } from "../../modules/site/lib/listing-meta";
import type { Route } from "./+types/category";

export function meta({ loaderData, matches }: Route.MetaArgs) {
  const site = matches[0].loaderData.site;
  if (!loaderData) return [{ title: `分类不存在 · ${site.title}` }];
  return listingMeta(site, `${loaderData.term.name} · 分类`, `${loaderData.term.name}分类下的文章。`, `/categories/${encodeURIComponent(loaderData.term.slug)}`, loaderData.results.page);
}


export { loadCategory as loader } from "../../modules/articles/loaders/category.server";

export { default } from "../../modules/articles/pages/category";
