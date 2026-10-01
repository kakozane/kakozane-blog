import { SiteHeader } from "../components/site-header";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useRouteLoaderData } from "react-router";
import type { Site } from "../types/site";

export function meta() { return [{ title: "关于 · Kakozane" }]; }

export default function About() {
  const { site } = useRouteLoaderData("root") as { site: Site };
  return (
    <div className="site-shell">
      <SiteHeader />
      <main className="simple-page">
        <p className="eyebrow">ABOUT</p>
        <h1>关于这个博客</h1>
        <div className="article-body"><ReactMarkdown remarkPlugins={[remarkGfm]}>{site.aboutMd}</ReactMarkdown></div>
      </main>
    </div>
  );
}
