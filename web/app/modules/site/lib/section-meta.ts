import type { Site } from "../types/site";

const sections: Record<string, { title: string; description: string }> = {
  "/posts": { title: "文章", description: "完整的写作与技术实践。" },
  "/archive": { title: "文章归档", description: "按发布时间浏览全部文章。" },
  "/topics": { title: "分类与标签", description: "按分类和标签浏览已发布的内容。" },
  "/notes": { title: "手记", description: "成篇的随笔与短文章。" },
  "/thinking": { title: "思考", description: "随时记下的想法与片段。" },
  "/says": { title: "一言", description: "值得留存的句子与出处。" },
  "/timeline": { title: "归档", description: "按时间回看文章。" },
  "/subscribe": { title: "订阅", description: "使用 RSS 阅读器订阅博客更新。" },
  "/about": { title: "关于", description: "" },
  "/friends": { title: "友情链接", description: "常逛的友站与值得收藏的网站。" },
  "/projects": { title: "项目", description: "我做过和正在做的项目。" },
  "/notes/series": { title: "手记专栏", description: "按专栏阅读手记。" },
  "/pages": { title: "页面", description: "关于这个网站的更多内容。" },
};

const canonicalPaths = new Set(["/archive", "/notes", "/thinking", "/says", "/timeline", "/subscribe", "/about", "/friends", "/projects", "/notes/series", "/pages"]);
const paginatedPaths = new Set(["/posts", "/archive", "/notes", "/thinking", "/says", "/timeline"]);

export function sectionMeta(site: Site, pathname: string, search: string) {
  const section = sections[pathname];
  if (!section) return null;
  const params = new URLSearchParams(search);
  const filtered = pathname === "/archive" && [...params.keys()].some((key) => key !== "page") ||
    pathname === "/notes" && params.get("featured") === "1" ||
    pathname === "/timeline" && ["year", "month", "kind", "featured"].some((key) => params.has(key));
  const page = Number(params.get("page"));
  const url = new URL(pathname, site.siteUrl);
  if (paginatedPaths.has(pathname) && Number.isSafeInteger(page) && page > 1 && page <= 100000) url.searchParams.set("page", String(page));
  const title = (pathname === "/notes" || pathname === "/timeline") && params.get("featured") === "1" ? "精选手记" : section.title;
  return {
    title: `${title} · ${site.title}`,
    description: section.description || site.description,
    canonical: canonicalPaths.has(pathname) && !filtered ? url.href : null,
    ogURL: filtered ? new URL(pathname + search, site.siteUrl).href : url.href,
    noindex: canonicalPaths.has(pathname) && filtered,
  };
}
