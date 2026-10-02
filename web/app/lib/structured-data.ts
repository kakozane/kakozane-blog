import type { Post } from "../types/content";
import type { Site } from "../types/site";
import { contentPath } from "./content-path.ts";

export function websiteData(site: Site) {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: site.title,
    url: new URL("/", site.siteUrl).href,
    description: site.description,
  };
}

export function postingData(post: Post, site: Site) {
  const url = new URL(contentPath(post.kind, post.slug), site.siteUrl).href;
  return {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.excerpt || post.title,
    url,
    mainEntityOfPage: url,
    datePublished: post.publishedAt ?? post.createdAt,
    dateModified: post.updatedAt,
    author: { "@type": "Person", name: post.authorName },
    ...(post.coverUrl ? { image: new URL(post.coverUrl, site.siteUrl).href } : {}),
  };
}

export function jsonLd(value: unknown): string {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}
