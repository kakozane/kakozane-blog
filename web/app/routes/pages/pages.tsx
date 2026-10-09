import type { Route } from "./+types/pages";

export function meta({ matches }: Route.MetaArgs) { return [{ title: `页面 · ${matches[0].loaderData.site.title}` }, { name: "description", content: "关于这个网站的更多内容。" }]; }

export { loadPages as loader } from "../../modules/pages/loaders/pages.server";

export { default } from "../../modules/pages/pages/pages";
