import { useState } from "react";
import { SiteFooter } from "../../../layouts/site-footer";
import { SiteHeader } from "../../../layouts/site-header";

const feeds = [
  { name: "文章订阅", description: "技术实践、生活记录与随笔。", href: "/feed.xml" },
] as const;

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
      <div className="page-intro"><h1>订阅更新</h1><p>把博客添加到 RSS 阅读器，就能在新内容发布后收到更新。无需注册账号。</p></div>
      <ul className="subscribe-list">{feeds.map((feed) => <li key={feed.href}>
        <div><h2>{feed.name}</h2><p>{feed.description}</p><code>{feed.href}</code></div>
        <div className="subscribe-actions"><a href={feed.href}>打开 RSS ↗</a><button onClick={() => void copy(feed.href)} type="button">复制地址</button></div>
        {notice?.href === feed.href && <p className="subscribe-notice" role="status">{notice.message}</p>}
      </li>)}</ul>
    </main>
    <SiteFooter />
  </div>;
}
