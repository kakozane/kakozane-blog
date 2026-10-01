import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useState, type FormEvent } from "react";
import { Link, useLoaderData, useRouteLoaderData } from "react-router";

import { SiteHeader } from "../components/site-header";
import { formatDate, formatDateTime } from "../lib/date";
import { getComments, getPost } from "../lib/posts.server";
import type { PublicUser } from "../types/auth";
import type { Site } from "../types/site";
import type { Route } from "./+types/post";

export async function loader({ params, request }: Route.LoaderArgs) {
  const page = Number(new URL(request.url).searchParams.get("commentsPage") ?? 1) || 1;
  const [post, comments] = await Promise.all([getPost(params.slug), getComments(params.slug, page)]);
  return { post, comments };
}

export function meta({ loaderData }: Route.MetaArgs) {
  if (!loaderData) return [{ title: "文章不存在 · Kakozane" }];
  const data = loaderData.post;
  return [
    { title: `${data.title} · Kakozane` },
    { name: "description", content: data.excerpt || data.title },
    { property: "og:title", content: data.title },
    { property: "og:description", content: data.excerpt || data.title },
  ];
}

export default function Post() {
  const { post, comments } = useLoaderData<typeof loader>();
  const { user, site } = useRouteLoaderData("root") as { user: PublicUser | null; site: Site };
  const [body, setBody] = useState("");
  const [parentID, setParentID] = useState<number | null>(null);
  const [commentMessage, setCommentMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submitComment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setCommentMessage("");
    try {
      const response = await fetch(`/api/v1/posts/${encodeURIComponent(post.slug)}/comments`, {
        method: "POST", headers: { "Content-Type": "application/json" }, credentials: "same-origin",
        body: JSON.stringify({ body, parentId: parentID }),
      });
      if (!response.ok) {
        const data = (await response.json()) as { error?: string };
        throw new Error(data.error ?? "提交失败");
      }
      setBody("");
      setParentID(null);
      setCommentMessage("评论已提交，审核通过后会显示。");
    } catch (cause) {
      setCommentMessage(cause instanceof Error ? cause.message : "提交失败");
    } finally { setSubmitting(false); }
  }
  return (
    <div className="site-shell">
      <SiteHeader />
      <main className="article-page">
        <Link className="back-link" to="/">← 返回文章列表</Link>
        <div className="post-meta">
          <time dateTime={post.publishedAt ?? post.createdAt}>{formatDate(post.publishedAt ?? post.createdAt, true)}</time>
          <span>·</span><span>{post.authorName}</span>
          {post.categoryName && <><span>·</span><Link to={`/?category=${encodeURIComponent(post.categorySlug)}`}>{post.categoryName}</Link></>}
        </div>
        <h1>{post.title}</h1>
        {post.excerpt && <p className="article-lead">{post.excerpt}</p>}
        {post.coverUrl && <img alt="" className="article-cover" src={post.coverUrl} />}
        <div className="article-body"><ReactMarkdown remarkPlugins={[remarkGfm]}>{post.contentMd}</ReactMarkdown></div>
        {post.tags.length > 0 && <div className="article-tags">{post.tags.map((tag) => <Link key={tag.id} to={`/?tag=${encodeURIComponent(tag.slug)}`}># {tag.name}</Link>)}</div>}
        <section className="comments" aria-labelledby="comments-title">
          <h2 id="comments-title">评论 <span>{comments.total}</span></h2>
          {comments.items.length === 0 && <p className="comments-empty">还没有评论，来留下第一条想法吧。</p>}
          {comments.items.map((comment) => <article className="comment" key={comment.id}>
            <div><strong>{comment.authorName}</strong><time dateTime={comment.createdAt}>{formatDateTime(comment.createdAt)}</time></div>
            {comment.parentId && <small>回复 #{comment.parentId}</small>}
            <p>{comment.body}</p>
            {user && <button onClick={() => setParentID(comment.id)} type="button">回复</button>}
          </article>)}
          {comments.total > comments.pageSize && <nav aria-label="评论分页" className="pagination">
            {comments.page > 1 && <Link to={`?commentsPage=${comments.page - 1}#comments-title`}>← 上一页</Link>}
            {comments.page * comments.pageSize < comments.total && <Link to={`?commentsPage=${comments.page + 1}#comments-title`}>下一页 →</Link>}
          </nav>}
          {user ? <form className="comment-form" onSubmit={submitComment}>
            <label htmlFor="comment-body">写下你的评论</label>
            {parentID && <p>回复 #{parentID} <button onClick={() => setParentID(null)} type="button">取消回复</button></p>}
            <textarea id="comment-body" maxLength={2000} onChange={(event) => setBody(event.target.value)} required rows={5} value={body} />
            <button disabled={submitting} type="submit">{submitting ? "提交中…" : "提交评论"}</button>
          </form> : <p className="comment-login"><Link to="/login">登录</Link>后参与讨论。</p>}
          {commentMessage && <p className="comment-message" role="status">{commentMessage}</p>}
        </section>
      </main>
      <footer className="site-footer"><span>© {new Date().getFullYear()} {site.title}</span><Link to="/">返回首页 ↑</Link></footer>
    </div>
  );
}
