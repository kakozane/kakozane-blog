import { SiteHeader } from "../../../layouts/site-header";
import { SiteFooter } from "../../../layouts/site-footer";
import { ArticleMarkdown } from "../../../shared/markdown/article-markdown";
import { ArticleToc } from "../../articles/components/article-toc";
import { useRouteLoaderData } from "react-router";
import { articleHeadings } from "../../../shared/markdown/article-headings";
import type { Site } from "../types/site";

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
