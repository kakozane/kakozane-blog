import type { Route } from "./+types/about";

export function meta({ matches }: Route.MetaArgs) { return [{ title: `关于 · ${matches[0].loaderData.site.title}` }]; }


export { default } from "../../modules/site/pages/about";
