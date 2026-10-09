import { redirect } from "react-router";
import type { Route } from "./+types/note-series-detail";

export function loader({ params, request }: Route.LoaderArgs) {
  return redirect(`/categories/${encodeURIComponent(params.slug)}${new URL(request.url).search}`, 301);
}
