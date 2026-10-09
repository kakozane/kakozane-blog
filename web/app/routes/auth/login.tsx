import { redirect } from "react-router";
import { login } from "../../modules/auth/api/auth";
import { authPagePath, safeReturnPath } from "../../modules/auth/lib/auth-return";
import type { Route } from "./+types/login";

export function meta({ matches }: Route.MetaArgs) {
  return [{ title: `登录 · ${matches[0].loaderData.site.title}` }];
}

export function loader({ request }: Route.LoaderArgs) {
  return redirect(authPagePath("login", safeReturnPath(new URL(request.url).searchParams.get("next"))));
}


export { default } from "../../modules/auth/components/login-form";
