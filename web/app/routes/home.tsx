import { Form, Link, useLoaderData, useRouteLoaderData } from "react-router";

import { PostList } from "../components/post-list";
import { SiteHeader } from "../components/site-header";
import { getCategories, getPosts } from "../lib/posts.server";
import type { Route } from "./+types/home";
import type { Site } from "../types/site";

export function meta() {
  return [
    { title: "Kakozane · 记录，思考，分享" },
    { name: "description", content: "记录技术实践、思考与生活的个人博客。" },
  ];
}

export async function loader({ request }: Route.LoaderArgs) {
  const params = new URL(request.url).searchParams;
  const [posts, categories] = await Promise.all([getPosts(params), getCategories()]);
  return { posts, categories, query: params.get("q") ?? "", category: params.get("category") ?? "", tag: params.get("tag") ?? "" };
}

export default function Home() {
  const { posts, categories, query, category, tag } = useLoaderData<typeof loader>();
  const { site } = useRouteLoaderData("root") as { site: Site };
  return (
    <div className="site-shell">
      <SiteHeader />
      <main>
        <section className="hero">
          <p className="eyebrow">KAKOZANE · PERSONAL BLOG</p>
          <h1>{site.tagline}</h1>
          <p className="hero-description">{site.description}</p>
        </section>
        <section className="content-section" aria-labelledby="latest-title">
          <div className="section-heading">
            <div><p className="eyebrow">THE JOURNAL</p><h2 id="latest-title">最新文章</h2></div>
            <span>{posts.total} 篇</span>
          </div>
          <Form className="post-search" method="get" role="search">
            <label className="sr-only" htmlFor="post-query">搜索文章</label>
            <input defaultValue={query} id="post-query" name="q" placeholder="搜索文章标题或摘要" type="search" />
            <button type="submit">搜索</button>
          </Form>
          {categories.length > 0 && (
            <nav aria-label="文章分类" className="category-nav">
              <Link aria-current={!category ? "page" : undefined} to="/">全部</Link>
              {categories.map((item) => <Link aria-current={category === item.slug ? "page" : undefined} key={item.id} to={`/?category=${encodeURIComponent(item.slug)}`}>{item.name}</Link>)}
            </nav>
          )}
          <PostList posts={posts.items} />
          {posts.total > posts.pageSize && (
            <nav aria-label="文章分页" className="pagination">
              {posts.page > 1 && <Link to={`/?page=${posts.page - 1}${query ? `&q=${encodeURIComponent(query)}` : ""}${category ? `&category=${encodeURIComponent(category)}` : ""}${tag ? `&tag=${encodeURIComponent(tag)}` : ""}`}>← 上一页</Link>}
              <span>第 {posts.page} 页</span>
              {posts.page * posts.pageSize < posts.total && <Link to={`/?page=${posts.page + 1}${query ? `&q=${encodeURIComponent(query)}` : ""}${category ? `&category=${encodeURIComponent(category)}` : ""}${tag ? `&tag=${encodeURIComponent(tag)}` : ""}`}>下一页 →</Link>}
            </nav>
          )}
        </section>
      </main>
      <footer className="site-footer"><span>© {new Date().getFullYear()} {site.title}</span><span>{site.githubUrl && <a href={site.githubUrl} rel="noopener noreferrer" target="_blank">GitHub ↗ · </a>}<a href="/feed.xml">RSS 订阅</a></span></footer>
    </div>
  );
}
