import { Link } from "react-router";

import { SiteFooter } from "../../../layouts/site-footer";
import { SiteHeader } from "../../../layouts/site-header";
import { formatDate } from "../../../shared/lib/date";
import { contentLabel, contentPath } from "../lib/content-path";
import type { PostList } from "../types/article";
import type { Term } from "../types/taxonomy";

export function TaxonomyPage({ label, term, results, base }: { label: string; term: Term; results: PostList; base: string }) {
  return <div className="site-shell">
    <SiteHeader />
    <main className="simple-page search-page">
      <div className="page-intro"><h1>{label} · {term.name}</h1><p>共 {results.total} 条公开内容。</p></div>
      <div className="search-results">
        {results.items.length === 0 && <p className="empty-posts">这个{label}下还没有公开内容。</p>}
        {results.items.map((item) => <article key={item.id}>
          <div className="post-meta"><span>{contentLabel(item.kind)}</span><span>·</span><time dateTime={item.publishedAt ?? item.createdAt}>{formatDate(item.publishedAt ?? item.createdAt, true)}</time></div>
          <h2><Link to={contentPath(item.kind, item.slug)}>{item.title}</Link></h2>
          {item.excerpt && <p>{item.excerpt}</p>}
        </article>)}
      </div>
      {results.total > results.pageSize && <nav aria-label={`${label}内容分页`} className="pagination">
        {results.page > 1 && <Link to={`${base}?page=${results.page - 1}`}>← 上一页</Link>}
        {results.page * results.pageSize < results.total && <Link to={`${base}?page=${results.page + 1}`}>下一页 →</Link>}
      </nav>}
    </main>
    <SiteFooter />
  </div>;
}
