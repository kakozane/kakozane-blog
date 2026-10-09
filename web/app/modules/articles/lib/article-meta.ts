import type { MetaDescriptor } from "react-router";

import type { Post } from "../types/article";
import type { Site } from "../../site/types/site";
import { contentLabel, contentPath } from "./content-path.ts";

export function articleMeta(post: Post, site: Site): MetaDescriptor[] {
  const kind = contentLabel(post.kind);
  const path = contentPath(post.kind, post.slug);
  const url = new URL(path, site.siteUrl).href;
  const description = post.excerpt || post.title;
  const image = post.coverUrl || site.avatarUrl;
  const imageUrl = image ? new URL(image, site.siteUrl).href : "";

  return [
    { title: `${post.title} · ${kind} · ${site.title}` },
    { name: "description", content: description },
    { tagName: "link", rel: "canonical", href: url },
    { property: "og:type", content: "article" },
    { property: "og:site_name", content: site.title },
    { property: "og:title", content: post.title },
    { property: "og:description", content: description },
    { property: "og:url", content: url },
    ...(imageUrl ? [
      { property: "og:image", content: imageUrl },
      { property: "og:image:alt", content: post.coverUrl ? `${post.title} 的封面` : `${site.title} 的头像` },
    ] : []),
    { name: "twitter:card", content: post.coverUrl ? "summary_large_image" : "summary" },
  ];
}
