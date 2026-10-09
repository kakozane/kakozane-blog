import { getSays } from "../api/says.server";

export async function loadSays({ request }: { request: Request }) {
  const rawPage = Number(new URL(request.url).searchParams.get("page") ?? 1);
  const page = Number.isInteger(rawPage) && rawPage > 0 && rawPage <= 100000 ? rawPage : 1;
  return getSays(page);
}
