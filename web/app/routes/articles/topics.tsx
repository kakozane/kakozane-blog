import type { Route } from "./+types/topics";

export function meta({ matches }: Route.MetaArgs) {
  const site = matches[0].loaderData.site;
  return [
    { title: `分类与标签 · ${site.title}` },
    { name: "description", content: "按分类和标签浏览已发布的文章。" },
    { tagName: "link", rel: "canonical", href: new URL("/topics", site.siteUrl).href },
  ];
}


export { loadTopics as loader } from "../../modules/articles/loaders/topics.server";

export { default } from "../../modules/articles/pages/topics";
