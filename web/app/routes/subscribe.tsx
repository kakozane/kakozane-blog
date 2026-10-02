import { useState } from "react";

import { SiteFooter } from "../components/site-footer";
import { SiteHeader } from "../components/site-header";
import type { Route } from "./+types/subscribe";

const feeds = [
  { name: "综合订阅", description: "公开发布的文章、手记与思考。", href: "/feed.xml" },
  { name: "手记", description: "日常记录与技术实践。", href: "/notes/feed.xml" },
  { name: "思考", description: "简短的想法与片段。", href: "/thinking/feed.xml" },
  { name: "一言", description: "收藏的句子与摘录。", href: "/says/feed.xml" },
] as const;

export function meta({ matches }: Route.MetaArgs) {
  return [{ title: `订阅 · ${matches[0].loaderData.site.title}` }, { name: "description", content: "使用 RSS 阅读器订阅博客更新。" }];
}

export default function Subscribe() {
  const [notice, setNotice] = useState<{ href: string; message: string } | null>(null);

  async function copy(href: string) {
    try {
      await navigator.clipboard.writeText(new URL(href, window.location.origin).href);
      setNotice({ href, message: "已复制订阅地址" });
    } catch {
      setNotice({ href, message: "复制失败，请打开链接后复制地址栏" });
    }
  }

  return <div className="site-shell">
    <SiteHeader />
    <main className="simple-page subscribe-page">
      <div className="page-intro"><h1>订阅更新</h1><p>把喜欢的栏目添加到 RSS 阅读器，就能在新内容发布后收到更新。无需注册账号。</p></div>
      <ul className="subscribe-list">{feeds.map((feed) => <li key={feed.href}>
        <div><h2>{feed.name}</h2><p>{feed.description}</p><code>{feed.href}</code></div>
        <div className="subscribe-actions"><a href={feed.href}>打开 RSS ↗</a><button onClick={() => void copy(feed.href)} type="button">复制地址</button></div>
        {notice?.href === feed.href && <p className="subscribe-notice" role="status">{notice.message}</p>}
      </li>)}</ul>
    </main>
    <SiteFooter />
  </div>;
}
