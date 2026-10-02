import { Form, Link, useLoaderData } from "react-router";

import { SiteFooter } from "../components/site-footer";
import { SiteHeader } from "../components/site-header";
import { formatDate } from "../lib/date";
import { getPages } from "../lib/pages.server";
import { getTimeline } from "../lib/posts.server";
import { contentLabel, contentPath } from "../lib/content-path";
import type { Route } from "./+types/search";

export function meta({ matches }: Route.MetaArgs) { return [{ title: `搜索 · ${matches[0].loaderData.site.title}` }, { name: "description", content: "搜索博客文章、手记、思考和页面。" }, { name: "robots", content: "noindex" }]; }

export async function loader({ request }: Route.LoaderArgs) {
  const params = new URL(request.url).searchParams;
  const query = Array.from((params.get("q") ?? "").trim()).slice(0, 100).join("");
  const [results, pages] = query ? await Promise.all([
    getTimeline(new URLSearchParams({ q: query, page: params.get("page") ?? "1" })), getPages(query),
  ]) : [{ items: [], total: 0, page: 1, pageSize: 50 }, []];
  return { query, results, pages };
}

export default function Search() {
  const { query, results, pages } = useLoaderData<typeof loader>();
  return <div className="site-shell">
    <SiteHeader />
    <main className="simple-page search-page">
      <h1>搜索</h1>
      <Form className="post-search" method="get" role="search">
        <label className="sr-only" htmlFor="site-query">搜索文章、手记、思考和页面</label>
        <input autoFocus defaultValue={query} id="site-query" maxLength={100} name="q" placeholder="搜索文章、手记、思考和页面" type="search" />
        <button type="submit">搜索</button>
      </Form>
      {query && <p className="search-summary">“{query}”找到 {results.total + pages.length} 条内容</p>}
      <div className="search-results">
        {query && results.total === 0 && pages.length === 0 && <p className="empty-posts">没有找到匹配的内容。</p>}
        {results.page === 1 && pages.map((page) => <article key={`page-${page.id}`}>
          <div className="post-meta"><span>页面</span><span>·</span><time dateTime={page.publishedAt ?? page.createdAt}>{formatDate(page.publishedAt ?? page.createdAt, true)}</time></div>
          <h2><Link to={`/pages/${encodeURIComponent(page.slug)}`}>{page.title}</Link></h2>
          {page.description && <p>{page.description}</p>}
        </article>)}
        {results.items.map((item) => <article key={item.id}>
          <div className="post-meta"><span>{contentLabel(item.kind)}</span><span>·</span><time dateTime={item.publishedAt ?? item.createdAt}>{formatDate(item.publishedAt ?? item.createdAt, true)}</time></div>
          <h2><Link to={contentPath(item.kind, item.slug)}>{item.title}</Link></h2>
          {item.excerpt && <p>{item.excerpt}</p>}
        </article>)}
      </div>
      {results.total > results.pageSize && <nav aria-label="搜索结果分页" className="pagination">
        {results.page > 1 && <Link to={`/search?q=${encodeURIComponent(query)}&page=${results.page - 1}`}>← 上一页</Link>}
        {results.page * results.pageSize < results.total && <Link to={`/search?q=${encodeURIComponent(query)}&page=${results.page + 1}`}>下一页 →</Link>}
      </nav>}
    </main>
    <SiteFooter />
  </div>;
}
