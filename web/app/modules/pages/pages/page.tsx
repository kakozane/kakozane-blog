import type { loadPage } from "../loaders/page.server";
import { Link, useLoaderData } from "react-router";
import { ArticleMarkdown } from "../../../shared/markdown/article-markdown";
import { ArticleToc } from "../../articles/components/article-toc";
import { SiteFooter } from "../../../layouts/site-footer";
import { SiteHeader } from "../../../layouts/site-header";
import { articleHeadings } from "../../../shared/markdown/article-headings";
import { formatDate } from "../../../shared/lib/date";

export default function Page() {
  const page = useLoaderData<typeof loadPage>();
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
