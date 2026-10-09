import { api } from "../../../shared/api/server.server.ts";
import type { FriendLink } from "../types/friend";

export async function getFriends(): Promise<FriendLink[]> {
  const response = await fetch(`${api}/api/v1/friends`);
  if (!response.ok) throw new Response("暂时无法读取友情链接", { status: 503 });
  return ((await response.json()) as { items: FriendLink[] }).items;
}
