import { useEffect, useState } from "react";

import { ArticleMarkdown } from "../components/article-markdown";
import { SiteFooter } from "../components/site-footer";
import { SiteHeader } from "../components/site-header";
import { adminPreviewOrigin, parsePreviewMessage, type PreviewPost } from "../lib/preview-message";
import type { Route } from "./+types/preview";

export function meta({ matches }: Route.MetaArgs) { return [{ title: `前台预览 · ${matches[0].loaderData.site.title}` }, { name: "robots", content: "noindex,nofollow" }]; }

export default function Preview() {
  const [post, setPost] = useState<PreviewPost | null>(null);

  useEffect(() => {
    const opener = window.opener;
    if (!opener) return;
    const origin = adminPreviewOrigin(window.location.href);
    function receive(event: MessageEvent) {
      if (event.origin !== origin || event.source !== opener) return;
      const next = parsePreviewMessage(event.data);
      if (!next) return;
      setPost(next);
      window.opener = null;
    }
    window.addEventListener("message", receive);
    opener.postMessage({ type: "kakozane-preview-ready" }, origin);
    return () => window.removeEventListener("message", receive);
  }, []);

  return <div className="site-shell">
    <SiteHeader />
    <main className="article-page">
      <p className="preview-notice" role="status">前台预览 · 当前表单内容仅在此窗口显示</p>
      {post ? <>
        <div className="post-meta"><span>{post.kind === "page" ? "页面" : "文章"}</span></div>
        <h1>{post.title}</h1>
        {post.excerpt && <p className="article-lead">{post.excerpt}</p>}
        {post.coverUrl && <img alt="" className="article-cover" src={post.coverUrl} />}
        <div className="article-body"><ArticleMarkdown articleID={0} source={post.contentMd} /></div>
      </> : <p className="empty-posts">等待管理后台发送内容。刷新此页后，请在编辑器中重新点击“前台预览”。</p>}
    </main>
    <SiteFooter />
  </div>;
}
