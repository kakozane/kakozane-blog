import type { Site } from "../types/site";

const fallback: Site = {
  title: "Kakozane", tagline: "记录，思考，分享。", description: "记录技术实践、思考与生活的个人博客。",
  aboutMd: "这里记录技术实践、遇到的问题，以及一路上的想法。文章会持续更新。",
  siteUrl: "https://kakozane.icu", githubUrl: "",
};

export async function getSite(): Promise<Site> {
  try {
    const api = process.env.API_INTERNAL_URL ?? "http://localhost:6324";
    const response = await fetch(`${api}/api/v1/site`);
    if (!response.ok) return fallback;
    return (await response.json()) as Site;
  } catch {
    return fallback;
  }
}
