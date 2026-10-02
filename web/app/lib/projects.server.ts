import type { Project } from "../types/project";

export async function getProjects(): Promise<Project[]> {
  const api = process.env.API_INTERNAL_URL ?? "http://localhost:6324";
  const response = await fetch(`${api}/api/v1/projects`);
  if (!response.ok) throw new Response("暂时无法读取项目", { status: 503 });
  return ((await response.json()) as { items: Project[] }).items;
}
