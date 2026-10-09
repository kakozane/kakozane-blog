import type { Route } from "./+types/archive";

export function meta({ matches }: Route.MetaArgs) {
  return [{ title: `归档 · ${matches[0].loaderData.site.title}` }, { name: "description", content: "按时间回看文章。" }];
}


export { loadArchive as loader } from "../../modules/articles/loaders/archive.server";

export { default } from "../../modules/articles/pages/archive";
