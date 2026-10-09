import { api } from "../../../shared/api/server.server.ts";
import type { PublicUser } from "../types/auth";
import type { LikedPostList } from "../../likes/types/like";


export async function frontUser(request: Request): Promise<PublicUser | null> {
  try {
    const response = await fetch(`${api}/api/v1/auth/me`, { headers: { Cookie: request.headers.get("Cookie") ?? "" } });
    if (!response.ok) return null;
    const data = (await response.json()) as { user: PublicUser };
    return data.user;
  } catch {
    return null;
  }
}

export async function likedPosts(request: Request, page: number): Promise<LikedPostList> {
  const response = await fetch(`${api}/api/v1/auth/likes?page=${page}`, { headers: { Cookie: request.headers.get("Cookie") ?? "" } });
  if (!response.ok) throw new Error("无法读取喜欢的内容");
  return (await response.json()) as LikedPostList;
}
