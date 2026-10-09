import type { Route } from "./+types/account";

export function meta({ matches }: Route.MetaArgs) { return [{ title: `我的账号 · ${matches[0].loaderData.site.title}` }, { name: "robots", content: "noindex,nofollow" }]; }
export function headers() { return { "Cache-Control": "private, no-store" }; }


export { loadAccount as loader } from "../../modules/auth/loaders/account.server";

export { default } from "../../modules/auth/pages/account";
