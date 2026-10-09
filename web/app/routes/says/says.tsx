import type { Route } from "./+types/says";

export function meta({ matches }: Route.MetaArgs) { return [{ title: `一言 · ${matches[0].loaderData.site.title}` }, { name: "description", content: "值得留存的句子与出处。" }]; }

export { loadSays as loader } from "../../modules/says/loaders/says.server";

export { default } from "../../modules/says/pages/says";
