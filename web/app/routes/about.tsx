import { SiteHeader } from "../components/site-header";
import { SiteFooter } from "../components/site-footer";
import { ArticleMarkdown } from "../components/article-markdown";
import { ArticleToc } from "../components/article-toc";
import { useRouteLoaderData } from "react-router";
import { articleHeadings } from "../lib/article-headings";
import type { Site } from "../types/site";
import type { Route } from "./+types/about";

export function meta({ matches }: Route.MetaArgs) { return [{ title: `关于 · ${matches[0].loaderData.site.title}` }]; }

export default function About() {
  const { site } = useRouteLoaderData("root") as { site: Site };
  const headings = articleHeadings(site.aboutMd, 0);
  return (
    <div className="site-shell">
      <SiteHeader />
      <main className="simple-page">
        <h1>关于这个博客</h1>
        <ArticleToc headings={headings} label="关于页面" />
        <div className="article-body"><ArticleMarkdown articleID={0} source={site.aboutMd} /></div>
      </main>
      <SiteFooter />
    </div>
  );
}
