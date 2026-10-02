import { Link, useLoaderData } from "react-router";

import { SiteFooter } from "../components/site-footer";
import { SiteHeader } from "../components/site-header";
import { formatDate } from "../lib/date";
import { getPages } from "../lib/pages.server";
import type { Route } from "./+types/pages";

export function meta({ matches }: Route.MetaArgs) { return [{ title: `页面 · ${matches[0].loaderData.site.title}` }, { name: "description", content: "关于这个网站的更多内容。" }]; }
export async function loader() { return getPages(); }

export default function Pages() {
  const pages = useLoaderData<typeof loader>();
  return <div className="site-shell">
    <SiteHeader />
    <main className="simple-page notes-page">
      <div className="page-intro"><h1>页面</h1><p>关于这个网站的更多内容。</p></div>
      {pages.length === 0 && <p className="empty-posts">还没有公开的页面。</p>}
      <div className="note-list">{pages.map((page) => <article className="note-card" key={page.id}>
        <time dateTime={page.publishedAt ?? page.createdAt}>{formatDate(page.publishedAt ?? page.createdAt, true)}</time>
        <h2><Link to={`/pages/${encodeURIComponent(page.slug)}`}>{page.title}</Link></h2>
        {page.description && <p>{page.description}</p>}
        <Link className="text-link" to={`/pages/${encodeURIComponent(page.slug)}`}>查看页面 <span aria-hidden="true">↗</span></Link>
      </article>)}</div>
    </main>
    <SiteFooter />
  </div>;
}
