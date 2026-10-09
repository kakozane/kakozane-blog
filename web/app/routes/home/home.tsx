import type { Route } from "./+types/home";

export function meta({ matches }: Route.MetaArgs) {
  const { site } = matches[0].loaderData;
  const url = new URL("/", site.siteUrl).href;
  return [
    { title: `${site.title} · ${site.tagline}` },
    { name: "description", content: site.description },
    { tagName: "link", rel: "canonical", href: url },
    { property: "og:type", content: "website" },
    { property: "og:site_name", content: site.title },
    { property: "og:title", content: site.title },
    { property: "og:description", content: site.description },
    { property: "og:url", content: url },
    ...(site.avatarUrl ? [
      { property: "og:image", content: new URL(site.avatarUrl, site.siteUrl).href },
      { property: "og:image:alt", content: `${site.title} 的头像` },
    ] : []),
    { name: "twitter:card", content: "summary" },
  ];
}


export { loadHome as loader } from "../../modules/home/loaders/home.server";

export { default } from "../../modules/home/pages/home";
