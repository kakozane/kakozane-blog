import { redirect } from "react-router";
import type { Route } from "./+types/timeline";

export function loader({ request }: Route.LoaderArgs) {
  const query = new URL(request.url).searchParams;
  query.delete("kind");
  query.delete("featured");
  return redirect(`/archive${query.size ? `?${query}` : ""}`, 301);
}
