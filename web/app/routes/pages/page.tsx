import type { Route } from "./+types/page";

export function meta({ loaderData, matches }: Route.MetaArgs) {
  const site = matches[0].loaderData.site;
  if (!loaderData) return [{ title: `页面不存在 · ${site.title}` }];
  const url = new URL(`/pages/${encodeURIComponent(loaderData.slug)}`, site.siteUrl).href;
  return [
    { title: `${loaderData.title} · ${site.title}` },
    { name: "description", content: loaderData.description || site.description },
    { tagName: "link", rel: "canonical", href: url },
    { property: "og:type", content: "article" },
    { property: "og:site_name", content: site.title },
    { property: "og:title", content: loaderData.title },
    { property: "og:description", content: loaderData.description || site.description },
    { property: "og:url", content: url },
    ...(site.avatarUrl ? [{ property: "og:image", content: new URL(site.avatarUrl, site.siteUrl).href }] : []),
    { name: "twitter:card", content: "summary" },
  ];
}


export { loadPage as loader } from "../../modules/pages/loaders/page.server";

export { default } from "../../modules/pages/pages/page";
