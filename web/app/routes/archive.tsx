import { Link, useLoaderData } from "react-router";

import { SiteHeader } from "../components/site-header";
import { SiteFooter } from "../components/site-footer";
import { formatDate } from "../lib/date";
import { getPosts } from "../lib/posts.server";
import type { Route } from "./+types/archive";

export function meta({ matches }: Route.MetaArgs) { return [{ title: `文章归档 · ${matches[0].loaderData.site.title}` }]; }

export async function loader({ request }: Route.LoaderArgs) {
  const params = new URL(request.url).searchParams;
  params.set("pageSize", "50");
  return getPosts(params);
}

export default function Archive() {
  const posts = useLoaderData<typeof loader>();
  return (
    <div className="site-shell">
      <SiteHeader />
      <main className="simple-page archive-page">
        <h1>文章归档</h1>
        <p>按发布时间收录的全部文章，共 {posts.total} 篇。</p>
        <div className="archive-list">
          {posts.items.map((post) => <div key={post.id}><time dateTime={post.publishedAt ?? post.createdAt}>{formatDate(post.publishedAt ?? post.createdAt)}</time><Link to={`/posts/${encodeURIComponent(post.slug)}`}>{post.title}</Link></div>)}
        </div>
        <nav aria-label="归档分页" className="pagination">
          {posts.page > 1 && <Link to={`/archive?page=${posts.page - 1}`}>← 上一页</Link>}
          {posts.page * posts.pageSize < posts.total && <Link to={`/archive?page=${posts.page + 1}`}>下一页 →</Link>}
        </nav>
      </main>
      <SiteFooter />
    </div>
  );
}
