import { Link, useLoaderData } from "react-router";

import { ArticleMarkdown } from "../components/article-markdown";
import { ArticleToc } from "../components/article-toc";
import { SiteFooter } from "../components/site-footer";
import { SiteHeader } from "../components/site-header";
import { articleHeadings } from "../lib/article-headings";
import { formatDate } from "../lib/date";
import { getPage } from "../lib/pages.server";
import type { Route } from "./+types/page";

export async function loader({ params }: Route.LoaderArgs) { return getPage(params.slug); }

export function meta({ loaderData, matches }: Route.MetaArgs) {
  const site = matches[0].loaderData.site;
  if (!loaderData) return [{ title: `页面不存在 · ${site.title}` }];
  const url = new URL(`/pages/${encodeURIComponent(loaderData.slug)}`, site.siteUrl).href;
  return [
    { title: `${loaderData.title} · ${site.title}` },
    { name: "description", content: loaderData.description || site.description },
    { tagName: "link", rel: "canonical", href: url },
    { property: "og:type", content: "article" },
    { property: "og:site_name", content: site.title },
    { property: "og:title", content: loaderData.title },
    { property: "og:description", content: loaderData.description || site.description },
    { property: "og:url", content: url },
    ...(site.avatarUrl ? [{ property: "og:image", content: new URL(site.avatarUrl, site.siteUrl).href }] : []),
    { name: "twitter:card", content: "summary" },
  ];
}

export default function Page() {
  const page = useLoaderData<typeof loader>();
  const headings = articleHeadings(page.contentMd ?? "", page.id);
  return <div className="site-shell">
    <SiteHeader />
    <main className="article-page">
      <Link className="back-link" to="/pages">← 返回页面列表</Link>
      <div className="post-meta"><time dateTime={page.publishedAt ?? page.createdAt}>{formatDate(page.publishedAt ?? page.createdAt, true)}</time></div>
      <h1>{page.title}</h1>
      {page.description && <p className="article-lead">{page.description}</p>}
      <ArticleToc headings={headings} label="页面" />
      <div className="article-body"><ArticleMarkdown articleID={page.id} source={page.contentMd ?? ""} /></div>
    </main>
    <SiteFooter />
  </div>;
}
