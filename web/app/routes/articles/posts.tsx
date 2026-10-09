import type { Route } from "./+types/posts";

export function meta({ loaderData, matches }: Route.MetaArgs) {
  const { site } = matches[0].loaderData;
  const canonical = new URL("/posts", site.siteUrl);
  if (loaderData?.posts.page && loaderData.posts.page > 1) canonical.searchParams.set("page", String(loaderData.posts.page));
  return [
    { title: `文章 · ${site.title}` },
    { name: "description", content: `浏览 ${site.title} 的文章与技术实践。` },
    ...(loaderData && (loaderData.query || loaderData.sort !== "newest") ? [{ name: "robots", content: "noindex,follow" }] : [{ tagName: "link", rel: "canonical", href: canonical.href }]),
  ];
}


export { loadPosts as loader } from "../../modules/articles/loaders/posts.server";

export { default } from "../../modules/articles/pages/posts";
