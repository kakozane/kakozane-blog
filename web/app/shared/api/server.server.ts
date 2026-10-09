export const api = process.env.API_INTERNAL_URL ?? "http://localhost:6324";

export async function get<T>(path: string): Promise<T> {
  const response = await fetch(`${api}/api/v1${path}`);
  if (response.status === 404) throw new Response("文章不存在", { status: 404 });
  if (!response.ok) throw new Response("暂时无法读取文章", { status: 503 });
  return (await response.json()) as T;
}
