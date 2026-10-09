import type { MetaDescriptor } from "react-router";

import type { Site } from "../types/site";

export function listingMeta(site: Site, title: string, description: string, path: string, page: number): MetaDescriptor[] {
  const url = new URL(path, site.siteUrl);
  if (Number.isSafeInteger(page) && page > 1 && page <= 100000) url.searchParams.set("page", String(page));
  return [
    { title: `${title} · ${site.title}` },
    { name: "description", content: description },
    { tagName: "link", rel: "canonical", href: url.href },
    { property: "og:type", content: "website" },
    { property: "og:site_name", content: site.title },
    { property: "og:title", content: title },
    { property: "og:description", content: description },
    { property: "og:url", content: url.href },
    ...(site.avatarUrl ? [{ property: "og:image", content: new URL(site.avatarUrl, site.siteUrl).href }] : []),
    { name: "twitter:card", content: "summary" },
  ];
}
