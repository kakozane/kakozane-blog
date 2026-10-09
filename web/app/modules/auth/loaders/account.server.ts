import { redirect } from "react-router";
import { frontUser, likedPosts } from "../api/auth.server";

export async function loadAccount({ request }: { request: Request }) {
  const user = await frontUser(request);
  if (!user) return redirect("/login");
  const requestedPage = Number(new URL(request.url).searchParams.get("likesPage") ?? 1);
  const page = Number.isSafeInteger(requestedPage) && requestedPage > 0 && requestedPage <= 100000 ? requestedPage : 1;
  const likes = await likedPosts(request, page).catch(() => null);
  return { user, likes };
}
