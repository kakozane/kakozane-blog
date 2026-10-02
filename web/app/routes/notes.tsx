import { Link, useLoaderData } from "react-router";

import { SiteFooter } from "../components/site-footer";
import { SiteHeader } from "../components/site-header";
import { formatDate } from "../lib/date";
import { getNotes, getNoteSeries } from "../lib/posts.server";
import type { Route } from "./+types/notes";

export function meta({ loaderData, matches }: Route.MetaArgs) {
  return [{ title: `${loaderData?.featured ? "精选手记" : "手记"} · ${matches[0].loaderData.site.title}` }, { name: "description", content: "成篇的随笔与短文章。" }];
}
export function links() { return [{ rel: "alternate", type: "application/rss+xml", title: "手记 RSS", href: "/notes/feed.xml" }]; }

export async function loader({ request }: Route.LoaderArgs) {
  const params = new URL(request.url).searchParams;
  const page = Number(params.get("page") ?? 1) || 1;
  const featured = params.get("featured") === "1";
  const [notes, series] = await Promise.all([getNotes(page, undefined, featured), getNoteSeries()]);
  return { notes, hasSeries: series.length > 0, featured };
}

export default function Notes() {
  const { notes, hasSeries, featured } = useLoaderData<typeof loader>();
  return <div className="site-shell">
    <SiteHeader />
    <main className="simple-page notes-page">
      <div className="page-intro"><h1>手记</h1><p>成篇的随笔与日常记录。</p><nav aria-label="浏览手记" className="page-intro-links">{hasSeries && <Link to="/notes/series">浏览专栏 ↗</Link>}<a href="/notes/feed.xml">订阅手记 RSS ↗</a></nav></div>
      <nav aria-label="手记筛选" className="notes-filter"><Link aria-current={!featured ? "page" : undefined} to="/notes">全部手记</Link><Link aria-current={featured ? "page" : undefined} to="/notes?featured=1">精选手记</Link></nav>
      <div className="note-list">
        {notes.items.length === 0 && <p className="empty-posts">{featured ? "还没有精选手记。" : "还没有公开的手记。"}</p>}
        {notes.items.map((note) => <article className="note-card" key={note.id}>
          <time dateTime={note.publishedAt ?? note.createdAt}>{formatDate(note.publishedAt ?? note.createdAt, true)}</time>{note.pinned && <span className="note-featured">精选</span>}
          <h2><Link to={`/notes/${encodeURIComponent(note.slug)}`}>{note.title}</Link></h2>
          {note.excerpt && <p>{note.excerpt}</p>}
          <Link className="text-link" to={`/notes/${encodeURIComponent(note.slug)}`}>阅读手记 <span aria-hidden="true">↗</span></Link>
        </article>)}
      </div>
      {notes.total > notes.pageSize && <nav aria-label="手记分页" className="pagination">
        {notes.page > 1 && <Link to={`/notes?page=${notes.page - 1}${featured ? "&featured=1" : ""}`}>← 上一页</Link>}
        {notes.page * notes.pageSize < notes.total && <Link to={`/notes?page=${notes.page + 1}${featured ? "&featured=1" : ""}`}>下一页 →</Link>}
      </nav>}
    </main>
    <SiteFooter />
  </div>;
}
