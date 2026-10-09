import { redirect } from "react-router";
import { register } from "../../modules/auth/api/auth";
import { authPagePath, safeReturnPath } from "../../modules/auth/lib/auth-return";
import type { Route } from "./+types/register";

export function meta({ matches }: Route.MetaArgs) { return [{ title: `注册 · ${matches[0].loaderData.site.title}` }]; }

export function loader({ request }: Route.LoaderArgs) {
  return redirect(authPagePath("register", safeReturnPath(new URL(request.url).searchParams.get("next"))));
}


export { default } from "../../modules/auth/components/register-form";
