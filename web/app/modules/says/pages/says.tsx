import type { loadSays } from "../loaders/says.server";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { remarkAlert } from "remark-github-blockquote-alert";
import { Link, useLoaderData } from "react-router";
import { SiteFooter } from "../../../layouts/site-footer";
import { SiteHeader } from "../../../layouts/site-header";
import { formatDate } from "../../../shared/lib/date";

export function links() { return [{ rel: "alternate", type: "application/rss+xml", title: "一言 RSS", href: "/says/feed.xml" }]; }

export default function Says() {
  const says = useLoaderData<typeof loadSays>();
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
