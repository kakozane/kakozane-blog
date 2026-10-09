import { getProjects } from "../api/projects.server";

export async function loadProjects() { return getProjects(); }
