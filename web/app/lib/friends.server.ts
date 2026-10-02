import type { FriendLink } from "../types/friend";

export async function getFriends(): Promise<FriendLink[]> {
  const api = process.env.API_INTERNAL_URL ?? "http://localhost:6324";
  const response = await fetch(`${api}/api/v1/friends`);
  if (!response.ok) throw new Response("暂时无法读取友情链接", { status: 503 });
  return ((await response.json()) as { items: FriendLink[] }).items;
}
