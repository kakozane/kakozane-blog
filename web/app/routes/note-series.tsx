import { Link, useLoaderData } from "react-router";

import { SiteFooter } from "../components/site-footer";
import { SiteHeader } from "../components/site-header";
import { getNoteSeries } from "../lib/posts.server";
import type { Route } from "./+types/note-series";

export function meta({ matches }: Route.MetaArgs) { return [{ title: `手记专栏 · ${matches[0].loaderData.site.title}` }, { name: "description", content: "按专栏阅读手记。" }]; }
export async function loader() { return getNoteSeries(); }

export default function NoteSeries() {
  const series = useLoaderData<typeof loader>();
  return <div className="site-shell">
    <SiteHeader />
    <main className="simple-page notes-page">
      <Link className="back-link" to="/notes">← 返回手记</Link>
      <div className="page-intro"><h1>手记专栏</h1><p>把相近主题的手记放在一起。</p></div>
      {series.length === 0 && <p className="empty-posts">还没有公开的手记专栏。</p>}
      <div className="note-list">{series.map((item) => <article className="note-card" key={item.id}>
        <h2><Link to={`/notes/series/${encodeURIComponent(item.slug)}`}>{item.name}</Link></h2>
        <p>{item.count} 篇手记</p>
      </article>)}</div>
    </main>
    <SiteFooter />
  </div>;
}
