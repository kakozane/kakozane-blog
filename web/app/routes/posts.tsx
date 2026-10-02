import { Form, Link, useLoaderData } from "react-router";

import { PostList } from "../components/post-list";
import { SiteFooter } from "../components/site-footer";
import { SiteHeader } from "../components/site-header";
import { getPosts } from "../lib/posts.server";
import { postSort, postView, postsHref } from "../lib/posts-options";
import type { Route } from "./+types/posts";

export function meta({ loaderData, matches }: Route.MetaArgs) {
  const { site } = matches[0].loaderData;
  const canonical = new URL("/posts", site.siteUrl);
  if (loaderData?.posts.page && loaderData.posts.page > 1) canonical.searchParams.set("page", String(loaderData.posts.page));
  return [
    { title: `文章 · ${site.title}` },
    { name: "description", content: `浏览 ${site.title} 的文章与技术实践。` },
    ...(loaderData && (loaderData.query || loaderData.sort !== "newest") ? [{ name: "robots", content: "noindex,follow" }] : [{ tagName: "link", rel: "canonical", href: canonical.href }]),
  ];
}

export async function loader({ request }: Route.LoaderArgs) {
  const search = new URL(request.url).searchParams;
  const query = Array.from((search.get("q") ?? "").trim()).slice(0, 100).join("");
  const requestedPage = Number(search.get("page") ?? 1);
  const page = Number.isSafeInteger(requestedPage) && requestedPage > 0 && requestedPage <= 100000 ? requestedPage : 1;
  const view = postView(search.get("view"));
  const sort = postSort(search.get("sort"));
  const params = new URLSearchParams({ page: String(page), pageSize: "12" });
  if (query) params.set("q", query);
  if (sort !== "newest") params.set("sort", sort);
  return { posts: await getPosts(params), query, view, sort };
}

export default function Posts() {
  const { posts, query, view, sort } = useLoaderData<typeof loader>();
  const href = (page: number, mode = view, order = sort) => postsHref(page, query, mode, order);

  return <div className="site-shell">
    <SiteHeader />
    <main className="simple-page posts-index">
      <div className="page-intro">
        <h1>文章</h1>
        <p>完整的写作与技术实践。</p>
        <nav aria-label="浏览文章" className="page-intro-links"><Link to="/archive">按时间查看归档 ↗</Link><Link to="/topics">按话题浏览 ↗</Link></nav>
      </div>
      <Form className="post-search" method="get" role="search">
        <label className="sr-only" htmlFor="article-query">搜索文章</label>
        <input defaultValue={query} id="article-query" maxLength={100} name="q" placeholder="搜索文章标题或摘要" type="search" />
        {view === "compact" && <input name="view" type="hidden" value="compact" />}
        {sort !== "newest" && <input name="sort" type="hidden" value={sort} />}
        <button type="submit">搜索</button>
      </Form>
      <div className="posts-toolbar"><p className="posts-summary">{query ? `“${query}”找到 ${posts.total} 篇文章` : `共 ${posts.total} 篇文章`}</p><div className="posts-options"><nav aria-label="文章排序方式" className="posts-sort"><Link aria-current={sort === "newest" ? "page" : undefined} to={href(1, view, "newest")}>最新</Link><Link aria-current={sort === "oldest" ? "page" : undefined} to={href(1, view, "oldest")}>最早</Link><Link aria-current={sort === "updated" ? "page" : undefined} to={href(1, view, "updated")}>最近更新</Link></nav><nav aria-label="文章显示方式" className="posts-view"><Link aria-current={view === "preview" ? "page" : undefined} to={href(posts.page, "preview")}>摘要</Link><Link aria-current={view === "compact" ? "page" : undefined} to={href(posts.page, "compact")}>紧凑</Link></nav></div></div>
      <h2 className="sr-only">文章列表</h2>
      {posts.items.length ? <PostList posts={posts.items} view={view} /> : <p className="empty-posts">{query ? "没有找到匹配的文章。" : "还没有公开的文章。"}</p>}
      {posts.total > posts.pageSize && <nav aria-label="文章分页" className="pagination">
        {posts.page > 1 && <Link to={href(posts.page - 1)}>← 上一页</Link>}
        <span>第 {posts.page} 页</span>
        {posts.page * posts.pageSize < posts.total && <Link to={href(posts.page + 1)}>下一页 →</Link>}
      </nav>}
    </main>
    <SiteFooter />
  </div>;
}
