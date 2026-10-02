import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { remarkAlert } from "remark-github-blockquote-alert";
import { Link, useLoaderData } from "react-router";

import { SiteFooter } from "../components/site-footer";
import { SiteHeader } from "../components/site-header";
import { contentPath } from "../lib/content-path";
import { formatDate } from "../lib/date";
import { getThoughts } from "../lib/posts.server";
import type { Route } from "./+types/thinking";

export function meta({ matches }: Route.MetaArgs) { return [{ title: `思考 · ${matches[0].loaderData.site.title}` }, { name: "description", content: "随时记下的想法与片段。" }]; }
export function links() { return [{ rel: "alternate", type: "application/rss+xml", title: "思考 RSS", href: "/thinking/feed.xml" }]; }

export async function loader({ request }: Route.LoaderArgs) {
  const page = Number(new URL(request.url).searchParams.get("page") ?? 1) || 1;
  return getThoughts(page);
}

export default function Thinking() {
  const thoughts = useLoaderData<typeof loader>();
  return <div className="site-shell">
    <SiteHeader />
    <main className="simple-page thinking-page">
      <div className="page-intro"><h1>思考</h1><p>一些不必写成长文章的想法。<a className="notes-rss" href="/thinking/feed.xml">订阅 RSS ↗</a></p></div>
      <div className="thinking-list">
        {thoughts.items.length === 0 && <p className="empty-posts">还没有公开的思考。</p>}
        {thoughts.items.map((thought) => <article className="thinking-entry" key={thought.id}>
          <time dateTime={thought.publishedAt ?? thought.createdAt}>{formatDate(thought.publishedAt ?? thought.createdAt, true)}</time>
          <div className="thinking-body"><ReactMarkdown remarkPlugins={[remarkGfm, remarkAlert]}>{thought.contentMd}</ReactMarkdown></div>
          <Link className="text-link" to={contentPath("thought", thought.slug)}>查看评论与点赞 ↗</Link>
        </article>)}
      </div>
      {thoughts.total > thoughts.pageSize && <nav aria-label="思考分页" className="pagination">
        {thoughts.page > 1 && <Link to={`/thinking?page=${thoughts.page - 1}`}>← 上一页</Link>}
        {thoughts.page * thoughts.pageSize < thoughts.total && <Link to={`/thinking?page=${thoughts.page + 1}`}>下一页 →</Link>}
      </nav>}
    </main>
    <SiteFooter />
  </div>;
}
