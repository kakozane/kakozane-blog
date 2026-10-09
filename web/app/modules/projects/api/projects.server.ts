import { api } from "../../../shared/api/server.server.ts";
import type { Project } from "../types/project";

export async function getProjects(): Promise<Project[]> {
  const response = await fetch(`${api}/api/v1/projects`);
  if (!response.ok) throw new Response("暂时无法读取项目", { status: 503 });
  return ((await response.json()) as { items: Project[] }).items;
}
