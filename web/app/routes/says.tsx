import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { remarkAlert } from "remark-github-blockquote-alert";
import { Link, useLoaderData } from "react-router";

import { SiteFooter } from "../components/site-footer";
import { SiteHeader } from "../components/site-header";
import { formatDate } from "../lib/date";
import { getSays } from "../lib/says.server";
import type { Route } from "./+types/says";

export function meta({ matches }: Route.MetaArgs) { return [{ title: `一言 · ${matches[0].loaderData.site.title}` }, { name: "description", content: "值得留存的句子与出处。" }]; }
export function links() { return [{ rel: "alternate", type: "application/rss+xml", title: "一言 RSS", href: "/says/feed.xml" }]; }

export async function loader({ request }: Route.LoaderArgs) {
  const rawPage = Number(new URL(request.url).searchParams.get("page") ?? 1);
  const page = Number.isInteger(rawPage) && rawPage > 0 && rawPage <= 100000 ? rawPage : 1;
  return getSays(page);
}

export default function Says() {
  const says = useLoaderData<typeof loader>();
  return <div className="site-shell">
    <SiteHeader />
    <main className="simple-page says-page">
      <div className="page-intro"><h1>一言</h1><p>值得留存的句子，也记下它们从哪里来。<a className="notes-rss" href="/says/feed.xml">订阅 RSS ↗</a></p></div>
      {says.items.length === 0 && <p className="empty-posts">这里还没有公开的一言。</p>}
      <div className="say-grid">{says.items.map((say) => <blockquote className="say-card" id={`say-${say.id}`} key={say.id}>
        <div className="say-text"><ReactMarkdown remarkPlugins={[remarkGfm, remarkAlert]}>{say.text}</ReactMarkdown></div>
        <footer><time dateTime={say.createdAt}>{formatDate(say.createdAt, true)}</time>
          <span>{say.source && <>《{say.source}》</>}{say.source && say.author && " · "}{say.author || (!say.source && "站长说")}</span>
        </footer>
      </blockquote>)}</div>
      {says.total > says.pageSize && <nav aria-label="一言分页" className="pagination">
        {says.page > 1 && <Link to={`/says?page=${says.page - 1}`}>← 上一页</Link>}
        {says.page * says.pageSize < says.total && <Link to={`/says?page=${says.page + 1}`}>下一页 →</Link>}
      </nav>}
    </main>
    <SiteFooter />
  </div>;
}
