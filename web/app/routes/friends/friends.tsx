import type { Route } from "./+types/friends";

export function meta({ matches }: Route.MetaArgs) { return [{ title: `友情链接 · ${matches[0].loaderData.site.title}` }, { name: "description", content: "常逛的友站与值得收藏的网站。" }]; }

export { loadFriends as loader } from "../../modules/friends/loaders/friends.server";

export { default } from "../../modules/friends/pages/friends";
