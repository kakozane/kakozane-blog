import { Link, useLoaderData } from "react-router";

import { SiteFooter } from "../components/site-footer";
import { SiteHeader } from "../components/site-header";
import { getCategories, getTags } from "../lib/posts.server";
import type { Route } from "./+types/topics";

export function meta({ matches }: Route.MetaArgs) {
  const site = matches[0].loaderData.site;
  return [
    { title: `话题 · ${site.title}` },
    { name: "description", content: "按分类和标签浏览已发布的文章、手记与思考。" },
    { tagName: "link", rel: "canonical", href: new URL("/topics", site.siteUrl).href },
  ];
}

export async function loader() {
  const [categories, tags] = await Promise.all([getCategories(), getTags()]);
  return { categories, tags };
}

export default function Topics() {
  const { categories, tags } = useLoaderData<typeof loader>();
  return <div className="site-shell">
    <SiteHeader />
    <main className="simple-page topics-page">
      <div className="page-intro"><h1>话题</h1><p>沿着分类与标签，找到感兴趣的内容。</p></div>
      <section aria-labelledby="topics-categories" className="topics-section">
        <h2 id="topics-categories">分类</h2>
        {categories.length ? <ul className="topics-list">{categories.map((item) => <li key={item.id}><Link to={`/categories/${encodeURIComponent(item.slug)}`}>{item.name} ↗</Link></li>)}</ul> : <p>还没有已发布内容的分类。</p>}
      </section>
      <section aria-labelledby="topics-tags" className="topics-section">
        <h2 id="topics-tags">标签</h2>
        {tags.length ? <ul className="topics-list">{tags.map((item) => <li key={item.id}><Link to={`/tags/${encodeURIComponent(item.slug)}`}># {item.name}</Link></li>)}</ul> : <p>还没有已发布内容的标签。</p>}
      </section>
    </main>
    <SiteFooter />
  </div>;
}
