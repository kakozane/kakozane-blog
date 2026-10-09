import { api } from "../../../shared/api/server.server.ts";
import type { SayList } from "../types/say";

export async function getSays(page = 1): Promise<SayList> {
  const response = await fetch(`${api}/api/v1/says?page=${page}`);
  if (!response.ok) throw new Response("暂时无法读取一言", { status: 503 });
  return response.json() as Promise<SayList>;
}
