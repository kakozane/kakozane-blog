import type { Route } from "./+types/search";

export function meta({ matches }: Route.MetaArgs) { return [{ title: `搜索 · ${matches[0].loaderData.site.title}` }, { name: "description", content: "搜索博客文章和页面。" }, { name: "robots", content: "noindex" }]; }


export { loadSearch as loader } from "../../modules/search/loaders/search.server";

export { default } from "../../modules/search/pages/search";
