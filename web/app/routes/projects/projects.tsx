import type { Route } from "./+types/projects";

export function meta({ matches }: Route.MetaArgs) { return [{ title: `项目 · ${matches[0].loaderData.site.title}` }, { name: "description", content: "我做过和正在做的项目。" }]; }

export { loadProjects as loader } from "../../modules/projects/loaders/projects.server";

export { default } from "../../modules/projects/pages/projects";
