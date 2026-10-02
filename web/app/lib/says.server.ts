import type { SayList } from "../types/say";

export async function getSays(page = 1): Promise<SayList> {
  const api = process.env.API_INTERNAL_URL ?? "http://localhost:6324";
  const response = await fetch(`${api}/api/v1/says?page=${page}`);
  if (!response.ok) throw new Response("暂时无法读取一言", { status: 503 });
  return response.json() as Promise<SayList>;
}
