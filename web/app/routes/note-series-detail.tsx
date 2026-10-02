import { Link, useLoaderData } from "react-router";

import { SiteFooter } from "../components/site-footer";
import { SiteHeader } from "../components/site-header";
import { formatDate } from "../lib/date";
import { listingMeta } from "../lib/listing-meta";
import { getNotes, getNoteSeries } from "../lib/posts.server";
import type { Route } from "./+types/note-series-detail";

export function meta({ loaderData, matches }: Route.MetaArgs) {
  const site = matches[0].loaderData.site;
  if (!loaderData) return [{ title: `专栏不存在 · ${site.title}` }];
  return listingMeta(site, `${loaderData.series.name} · 手记专栏`, `${loaderData.series.name}专栏的手记。`, `/notes/series/${encodeURIComponent(loaderData.series.slug)}`, loaderData.notes.page);
}

export async function loader({ params, request }: Route.LoaderArgs) {
  const series = (await getNoteSeries()).find((item) => item.slug === params.slug);
  if (!series) throw new Response("专栏不存在", { status: 404 });
  const page = Number(new URL(request.url).searchParams.get("page") ?? 1) || 1;
  return { series, notes: await getNotes(page, series.slug) };
}

export default function NoteSeriesDetail() {
  const { series, notes } = useLoaderData<typeof loader>();
  const base = `/notes/series/${encodeURIComponent(series.slug)}`;
  return <div className="site-shell">
    <SiteHeader />
    <main className="simple-page notes-page">
      <Link className="back-link" to="/notes/series">← 返回专栏</Link>
      <div className="page-intro"><h1>{series.name}</h1><p>共 {series.count} 篇手记</p></div>
      {notes.items.length === 0 && <p className="empty-posts">这一页没有手记。</p>}
      <div className="note-list">{notes.items.map((note) => <article className="note-card" key={note.id}>
        <time dateTime={note.publishedAt ?? note.createdAt}>{formatDate(note.publishedAt ?? note.createdAt, true)}</time>
        <h2><Link to={`/notes/${encodeURIComponent(note.slug)}`}>{note.title}</Link></h2>
        {note.excerpt && <p>{note.excerpt}</p>}
        <Link className="text-link" to={`/notes/${encodeURIComponent(note.slug)}`}>阅读手记 <span aria-hidden="true">↗</span></Link>
      </article>)}</div>
      {notes.total > notes.pageSize && <nav aria-label="专栏手记分页" className="pagination">
        {notes.page > 1 && <Link to={`${base}?page=${notes.page - 1}`}>← 上一页</Link>}
        {notes.page * notes.pageSize < notes.total && <Link to={`${base}?page=${notes.page + 1}`}>下一页 →</Link>}
      </nav>}
    </main>
    <SiteFooter />
  </div>;
}
