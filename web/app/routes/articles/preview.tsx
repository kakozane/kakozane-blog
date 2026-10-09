import type { Route } from "./+types/preview";

export function meta({ matches }: Route.MetaArgs) { return [{ title: `前台预览 · ${matches[0].loaderData.site.title}` }, { name: "robots", content: "noindex,nofollow" }]; }


export { default } from "../../modules/articles/pages/preview";
