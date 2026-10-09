import type { Route } from "./+types/subscribe";

export function meta({ matches }: Route.MetaArgs) {
  return [{ title: `订阅 · ${matches[0].loaderData.site.title}` }, { name: "description", content: "使用 RSS 阅读器订阅博客更新。" }];
}


export { default } from "../../modules/site/pages/subscribe";
