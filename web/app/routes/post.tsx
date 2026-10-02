import { Heart, MessageCircle, Rss, Share2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { Link, useLoaderData, useLocation, useRouteLoaderData } from "react-router";

import { SiteHeader } from "../components/site-header";
import { SiteFooter } from "../components/site-footer";
import { ArticleMarkdown } from "../components/article-markdown";
import { ArticleToc } from "../components/article-toc";
import { CommentMarkdown } from "../components/comment-markdown";
import { formatDate, formatDateTime } from "../lib/date";
import { articleMeta } from "../lib/article-meta";
import { authPagePath } from "../lib/auth-return";
import { contentLabel, contentListPath, contentPath } from "../lib/content-path";
import { articleHeadings } from "../lib/article-headings";
import { progressThroughArticle, savedReadingProgress, savedReadingSize, scrollYForProgress } from "../lib/reading";
import { isOutdated, readingStats, wasRevised } from "../lib/reading-stats";
import { addSelectionQuote } from "../lib/selection-quote";
import { shareArticle } from "../lib/share";
import { jsonLd, postingData } from "../lib/structured-data";
import { commentPageFromSearch, getComments, getLikes, getPost, getPostConnections } from "../lib/posts.server";
import type { Comment, CommentList, LikeState } from "../types/content";
import type { PublicUser } from "../types/auth";
import type { Site } from "../types/site";
import type { Route } from "./+types/post";

export async function loader({ params, request }: Route.LoaderArgs) {
  const page = await commentPageFromSearch(params.slug, "post", new URL(request.url).searchParams);
  const [post, comments, connections, likes] = await Promise.all([
    getPost(params.slug), getComments(params.slug, page),
    getPostConnections(params.slug, "post"), getLikes(params.slug, "post"),
  ]);
  return { post, comments, likes, more: connections.items, previous: connections.previous, next: connections.next };
}

export function meta({ loaderData, matches }: Route.MetaArgs) {
  const site = matches[0].loaderData.site;
  if (!loaderData) return [{ title: `文章不存在 · ${site.title}` }];
  return articleMeta(loaderData.post, site);
}

export default function Post() {
  const location = useLocation();
  const { post, comments, more, previous, next, likes } = useLoaderData<typeof loader>();
  const { user, site } = useRouteLoaderData("root") as { user: PublicUser | null; site: Site };
  const [likeOverride, setLikeOverride] = useState<{ postID: number; state: LikeState } | null>(null);
  const [likeBusy, setLikeBusy] = useState(false);
  const [likeMessage, setLikeMessage] = useState("");
  const [shareMessage, setShareMessage] = useState("");
  const likeState = likeOverride?.postID === post.id ? likeOverride.state : likes;
  const likeURL = `/api/v1${contentPath(post.kind, post.slug)}/likes`;
  const loginPath = authPagePath("login", `${location.pathname}${location.search}`);
  const commentLoginPath = authPagePath("login", `${location.pathname}${location.search}#comments-title`);
  const bodyRef = useRef<HTMLDivElement>(null);
  const commentInputRef = useRef<HTMLTextAreaElement>(null);
  const headings = useMemo(() => articleHeadings(post.contentMd ?? "", post.id), [post.contentMd, post.id]);
  const stats = useMemo(() => readingStats(post.contentMd ?? ""), [post.contentMd]);
  const [activeHeading, setActiveHeading] = useState("");
  const [readingProgress, setReadingProgress] = useState(0);
  const [resumeProgress, setResumeProgress] = useState<number | null>(null);
  const savedBucket = useRef<number | null>(null);
  const completedReading = useRef(false);
  const readingKey = `blog-reading:${post.kind}:${post.id}`;
  const [readingFont, setReadingFont] = useState<"sans" | "serif">(post.kind === "note" ? "serif" : "sans");
  const [readingSize, setReadingSize] = useState<0 | 1 | 2>(0);
  const [focusPostID, setFocusPostID] = useState<number | null>(null);
  const focusReading = focusPostID === post.id;
  const [body, setBody] = useState("");
  const [replyTo, setReplyTo] = useState<{ postID: number; id: number; authorName: string } | null>(null);
  const activeReply = replyTo?.postID === post.id ? replyTo : null;
  const [commentMessage, setCommentMessage] = useState("");
  const [commentPreview, setCommentPreview] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [myComments, setMyComments] = useState<{ postID: number; items: Comment[]; total: number } | null>(null);
  const [myCommentsError, setMyCommentsError] = useState("");
  const [editingComment, setEditingComment] = useState<{ postID: number; id: number } | null>(null);
  const activeEdit = editingComment?.postID === post.id ? editingComment : null;
  const ownComments = myComments?.postID === post.id ? myComments.items : [];
  const ownTotal = myComments?.postID === post.id ? myComments.total : 0;
  const [selectionQuote, setSelectionQuote] = useState<{ text: string; x: number; y: number } | null>(null);

  useEffect(() => {
    if (!user) return;
    let active = true;
    setMyCommentsError("");
    fetch(`/api/v1${contentPath(post.kind, post.slug)}/comments/mine`, { credentials: "same-origin" })
      .then((response) => {
        if (!response.ok) throw new Error("暂时无法读取你的待审核评论");
        return response.json() as Promise<CommentList>;
      })
      .then((list) => { if (active) setMyComments({ postID: post.id, items: list.items, total: list.total }); })
      .catch((cause) => { if (active) setMyCommentsError(cause instanceof Error ? cause.message : "暂时无法读取你的待审核评论"); });
    return () => { active = false; };
  }, [post.id, post.kind, post.slug, user?.id]);

  useEffect(() => {
    setSelectionQuote(null);
    if (!user) return;
    function updateSelection() {
      const article = bodyRef.current;
      const selection = window.getSelection();
      if (!article || !selection || selection.isCollapsed || !selection.anchorNode || !selection.focusNode || !article.contains(selection.anchorNode) || !article.contains(selection.focusNode)) {
        setSelectionQuote(null);
        return;
      }
      const text = selection.toString().replace(/\s+/g, " ").trim();
      if (!text) { setSelectionQuote(null); return; }
      const rect = selection.getRangeAt(0).getBoundingClientRect();
      if (!rect.width && !rect.height) return;
      setSelectionQuote({ text, x: Math.max(70, Math.min(window.innerWidth - 70, rect.left + rect.width / 2)), y: rect.top > 52 ? rect.top - 48 : rect.bottom + 8 });
    }
    document.addEventListener("selectionchange", updateSelection);
    window.addEventListener("scroll", updateSelection, { passive: true });
    window.addEventListener("resize", updateSelection);
    return () => {
      document.removeEventListener("selectionchange", updateSelection);
      window.removeEventListener("scroll", updateSelection);
      window.removeEventListener("resize", updateSelection);
    };
  }, [post.id, user]);

  function quoteInComment() {
    if (!selectionQuote) return;
    const next = addSelectionQuote(activeEdit ? "" : body, selectionQuote.text);
    if (!next) { setCommentMessage("评论已接近 2000 字上限，请先精简内容。"); return; }
    setBody(next);
    setReplyTo(null);
    setEditingComment(null);
    setSelectionQuote(null);
    window.getSelection()?.removeAllRanges();
    requestAnimationFrame(() => {
      commentInputRef.current?.focus({ preventScroll: true });
      commentInputRef.current?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth", block: "center" });
    });
  }

  useEffect(() => {
    try {
      const savedFont = window.localStorage.getItem("blog-reading-font");
      setReadingFont(savedFont === "sans" || savedFont === "serif" ? savedFont : post.kind === "note" ? "serif" : "sans");
      setReadingSize(savedReadingSize(window.localStorage.getItem("blog-reading-size")));
    } catch { /* 无法使用本地存储时仍可在当前页面切换。 */ }
  }, [post.kind]);

  useEffect(() => {
    savedBucket.current = null;
    completedReading.current = false;
    if (post.kind === "thought") { setResumeProgress(null); return; }
    try { setResumeProgress(savedReadingProgress(window.localStorage.getItem(readingKey), post.updatedAt)); }
    catch { setResumeProgress(null); }
  }, [post.kind, post.updatedAt, readingKey]);

  function resumeReading() {
    const article = bodyRef.current;
    if (!article || resumeProgress === null) return;
    const top = article.getBoundingClientRect().top + window.scrollY;
    window.scrollTo({ top: scrollYForProgress(resumeProgress, top, article.offsetHeight, window.innerHeight), behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
    setResumeProgress(null);
  }

  function chooseReadingFont(font: "sans" | "serif") {
    setReadingFont(font);
    try { window.localStorage.setItem("blog-reading-font", font); } catch { /* 无法使用本地存储时仍可在当前页面切换。 */ }
  }

  function changeReadingSize(next: 0 | 1 | 2) {
    setReadingSize(next);
    try { window.localStorage.setItem("blog-reading-size", String(next)); } catch { /* 无法使用本地存储时仍可在当前页面切换。 */ }
  }

  const toggleFocusReading = useCallback(() => {
    const before = bodyRef.current?.getBoundingClientRect().top;
    setFocusPostID((current) => current === post.id ? null : post.id);
    if (before !== undefined) requestAnimationFrame(() => {
      const after = bodyRef.current?.getBoundingClientRect().top;
      if (after !== undefined) window.scrollBy(0, after - before);
    });
  }, [post.id]);

  useEffect(() => {
    if (!focusReading) return;
    function exitOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape" && !document.querySelector(".image-lightbox[open]")) toggleFocusReading();
    }
    window.addEventListener("keydown", exitOnEscape);
    return () => window.removeEventListener("keydown", exitOnEscape);
  }, [focusReading, toggleFocusReading]);

  useEffect(() => {
    const article = bodyRef.current;
    if (!article) return;
    const elements = headings.map(({ id }) => document.getElementById(id)).filter((heading): heading is HTMLHeadingElement => heading instanceof HTMLHeadingElement);

    function updateReadingState() {
      if (!article) return;
      const start = article.getBoundingClientRect().top + window.scrollY;
      const progress = progressThroughArticle(window.scrollY, start, article.offsetHeight, window.innerHeight);
      setReadingProgress(progress);
      if (post.kind !== "thought" && article.offsetHeight > window.innerHeight && progress >= 5) {
        setResumeProgress(null);
        if (progress >= 95) completedReading.current = true;
        const bucket = completedReading.current ? 100 : Math.floor(progress / 5) * 5;
        if (savedBucket.current !== bucket) {
          try {
            if (completedReading.current) window.localStorage.removeItem(readingKey);
            else window.localStorage.setItem(readingKey, JSON.stringify({ updatedAt: post.updatedAt, progress }));
            savedBucket.current = bucket;
          } catch { /* 浏览器禁用本地存储时仅显示当前进度。 */ }
        }
      }
      // ponytail: scan headings on scroll; use IntersectionObserver if very long articles make this slow.
      const current = elements.filter((heading) => heading.getBoundingClientRect().top <= 120).at(-1);
      setActiveHeading(current?.id ?? "");
    }
    updateReadingState();
    window.addEventListener("scroll", updateReadingState, { passive: true });
    window.addEventListener("resize", updateReadingState);
    return () => {
      window.removeEventListener("scroll", updateReadingState);
      window.removeEventListener("resize", updateReadingState);
    };
  }, [headings, readingFont, readingSize, focusReading, post.kind, post.updatedAt, readingKey]);

  useEffect(() => {
    if (!user) return;
    let active = true;
    fetch(likeURL, { credentials: "same-origin" })
      .then((response) => response.ok ? response.json() as Promise<LikeState> : null)
      .then((state) => { if (active && state) setLikeOverride({ postID: post.id, state }); })
      .catch(() => { if (active) setLikeMessage("暂时无法读取点赞"); });
    return () => { active = false; };
  }, [likeURL, post.id, user]);

  async function toggleLike() {
    setLikeBusy(true);
    setLikeMessage("");
    setShareMessage("");
    try {
      const response = await fetch(likeURL, { method: likeState.liked ? "DELETE" : "PUT", credentials: "same-origin" });
      if (!response.ok) throw new Error(response.status === 401 ? "请重新登录后点赞" : "暂时无法更新点赞");
      setLikeOverride({ postID: post.id, state: await response.json() as LikeState });
    } catch (cause) {
      setLikeMessage(cause instanceof Error ? cause.message : "暂时无法更新点赞");
    } finally { setLikeBusy(false); }
  }

  async function share() {
    setShareMessage("");
    setLikeMessage("");
    try {
      const url = `${window.location.origin}${window.location.pathname}`;
      const result = await shareArticle(post.title, url, navigator);
      if (result === "copied") setShareMessage("链接已复制，可以发给朋友了。");
    } catch {
      setShareMessage("分享失败，请复制地址栏中的链接。");
    }
  }

  async function submitComment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setCommentMessage("");
    try {
      const endpoint = `/api/v1${contentPath(post.kind, post.slug)}/comments`;
      const response = await fetch(activeEdit ? `${endpoint}/${activeEdit.id}` : endpoint, {
        method: activeEdit ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, credentials: "same-origin",
        body: JSON.stringify(activeEdit ? { body } : { body, parentId: activeReply?.id ?? null }),
      });
      if (!response.ok) {
        const data = (await response.json()) as { error?: string };
        throw new Error(data.error ?? "提交失败");
      }
      const saved = await response.json() as Comment;
      setMyComments((current) => {
        const previous = current?.postID === post.id ? current : { postID: post.id, items: [], total: 0 };
        return activeEdit
          ? { ...previous, items: previous.items.map((item) => item.id === saved.id ? saved : item) }
          : { ...previous, items: [saved, ...previous.items].slice(0, 50), total: previous.total + 1 };
      });
      setBody("");
      setCommentPreview(false);
      setReplyTo(null);
      setEditingComment(null);
      setMyCommentsError("");
      setCommentMessage(activeEdit ? "修改已保存，重新等待审核。" : "评论已提交，审核通过后会显示。");
    } catch (cause) {
      setCommentMessage(cause instanceof Error ? cause.message : "提交失败");
    } finally { setSubmitting(false); }
  }
  return (
    <div className="site-shell article-shell" data-focus-reading={focusReading} data-content-kind={post.kind}>
      <script dangerouslySetInnerHTML={{ __html: jsonLd(postingData(post, site)) }} type="application/ld+json" />
      {post.kind !== "thought" && <div aria-label="阅读进度" aria-valuemax={100} aria-valuemin={0} aria-valuenow={readingProgress} className="reading-progress" role="progressbar"><span style={{ width: `${readingProgress}%` }} /></div>}
      <SiteHeader />
      <main className="article-page">
        <header className="article-heading"><Link className="back-link" to={contentListPath(post.kind)}>← 返回{contentLabel(post.kind)}列表</Link>
        <div className="post-meta">
          <time dateTime={post.publishedAt ?? post.createdAt}>{formatDate(post.publishedAt ?? post.createdAt, true)}</time>
          <span>·</span><span>{post.authorName}</span>
          {post.categoryName && <><span>·</span><Link to={post.kind === "note" ? `/notes/series/${encodeURIComponent(post.categorySlug)}` : `/categories/${encodeURIComponent(post.categorySlug)}`}>{post.categoryName}</Link></>}
          {post.kind === "note" && post.pinned && <><span aria-hidden="true">·</span><span className="post-pinned">精选</span></>}
          {post.kind !== "thought" && <><span aria-hidden="true">·</span><span>{stats.characters.toLocaleString("zh-CN")} 字 · 阅读约 {stats.minutes} 分钟</span></>}
          {wasRevised(post.publishedAt, post.updatedAt) && <><span aria-hidden="true">·</span><span>更新于 <time dateTime={post.updatedAt}>{formatDateTime(post.updatedAt)}</time></span></>}
        </div>
        <h1 className={post.kind === "thought" ? "sr-only" : undefined}>{post.title}</h1>
        {resumeProgress !== null && <button className="resume-reading" onClick={resumeReading} type="button">从上次的 {resumeProgress}% 继续阅读 ↗</button>}
        {post.kind !== "thought" && post.excerpt && <p className="article-lead">{post.excerpt}</p>}
        </header>
        {post.coverUrl && <img alt="" className="article-cover" src={post.coverUrl} />}
        <ArticleToc activeHeading={activeHeading} headings={headings} label="文章" />
        <div aria-label="阅读设置" className="article-reading-tools" role="group"><span>字体</span><button aria-pressed={readingFont === "sans"} className="font-choice" onClick={() => chooseReadingFont("sans")} type="button">默认</button><button aria-pressed={readingFont === "serif"} className="font-choice" onClick={() => chooseReadingFont("serif")} type="button">衬线</button><span aria-live="polite" className="reading-size-label">字号 · {(["标准", "较大", "最大"] as const)[readingSize]}</span><button aria-label="缩小正文字号" className="size-choice" disabled={readingSize === 0} onClick={() => changeReadingSize(readingSize === 2 ? 1 : 0)} type="button">A−</button><button aria-label="放大正文字号" className="size-choice" disabled={readingSize === 2} onClick={() => changeReadingSize(readingSize === 0 ? 1 : 2)} type="button">A+</button>{post.kind !== "thought" && <button aria-pressed={focusReading} className="focus-choice" onClick={toggleFocusReading} type="button">{focusReading ? "退出沉浸" : "沉浸阅读"}</button>}</div>
        <aside aria-label="内容快捷操作" className="article-action-aside"><div className="article-action-rail">
          {user ? <button aria-label={`喜欢，当前 ${likeState.count} 人喜欢`} aria-pressed={likeState.liked} disabled={likeBusy} onClick={() => void toggleLike()} title="喜欢" type="button"><Heart aria-hidden="true" fill={likeState.liked ? "currentColor" : "none"} size={18} /><span>{likeState.count}</span></button> : <Link aria-label={`登录后点赞，当前 ${likeState.count} 人喜欢`} title="登录后点赞" to={loginPath}><Heart aria-hidden="true" size={18} /><span>{likeState.count}</span></Link>}
          <a aria-label={`查看 ${comments.total} 条评论`} href="#comments-title" title="查看评论"><MessageCircle aria-hidden="true" size={18} /><span>{comments.total}</span></a>
          <button aria-label="分享内容" onClick={() => void share()} title="分享" type="button"><Share2 aria-hidden="true" size={18} /></button>
          <Link aria-label="订阅博客更新" title="订阅" to="/subscribe"><Rss aria-hidden="true" size={18} /></Link>
          {(likeMessage || shareMessage) && <p aria-hidden="true" className="article-aside-message">{likeMessage || shareMessage}</p>}
        </div></aside>
        {post.kind === "post" && isOutdated(post.updatedAt) && <aside className="article-outdated"><strong>阅读提示</strong><span>这篇文章已有半年未更新，部分信息可能发生变化，请结合最新资料阅读。</span></aside>}
        <div className="article-body" data-reading-font={readingFont} data-reading-size={readingSize} ref={bodyRef}><ArticleMarkdown articleID={post.id} key={post.id} source={post.contentMd ?? ""} /></div>
        {post.tags.length > 0 && <div className="article-tags">{post.tags.map((tag) => <Link key={tag.id} to={`/tags/${encodeURIComponent(tag.slug)}`}># {tag.name}</Link>)}</div>}
        <div className="article-actions"><div className="article-likes">{user ? <button aria-pressed={likeState.liked} disabled={likeBusy} onClick={() => void toggleLike()} type="button">{likeState.liked ? "♥ 已喜欢" : "♡ 喜欢"} <span>{likeState.count}</span></button> : <p>♡ {likeState.count} 人喜欢 · <Link to={loginPath}>登录后点赞</Link></p>}</div><a className="article-share" href="#comments-title">评论 {comments.total} ↘</a><button className="article-share" onClick={() => void share()} type="button">分享 ↗</button></div>
        {likeMessage && <p className="article-action-message" role="status">{likeMessage}</p>}
        {shareMessage && <p className="article-action-message" role="status">{shareMessage}</p>}
        {(previous || next) && <nav aria-label={`${contentLabel(post.kind)}前后篇`} className="article-neighbors">
          {previous && <Link to={contentPath(post.kind, previous.slug)}><span>← 上一篇</span><strong>{previous.title}</strong></Link>}
          {next && <Link className="article-next" to={contentPath(post.kind, next.slug)}><span>下一篇 →</span><strong>{next.title}</strong></Link>}
        </nav>}
        {more.length > 0 && <nav aria-label="继续阅读" className="more-reading"><h2>更多{contentLabel(post.kind)}</h2><ul>{more.map((item) => <li key={item.id}><Link to={contentPath(item.kind, item.slug)}>{item.title}</Link><time dateTime={item.publishedAt ?? item.createdAt}>{formatDate(item.publishedAt ?? item.createdAt, true)}</time></li>)}</ul></nav>}
        <section className="comments" aria-labelledby="comments-title">
          <h2 id="comments-title">评论 <span>{comments.total}</span></h2>
          {comments.items.length === 0 && <p className="comments-empty">还没有评论，来留下第一条想法吧。</p>}
          {comments.items.map((comment) => <article className={`comment${comment.parentId ? " comment-reply" : ""}`} id={`comment-${comment.id}`} key={comment.id}>
            <div className="comment-heading"><strong>{comment.authorName}</strong>{comment.pinned && <span className="comment-pinned">置顶</span>}<time dateTime={comment.createdAt}>{formatDateTime(comment.createdAt)}</time><a aria-label={`打开 ${comment.authorName} 的评论链接`} className="comment-permalink" href={`${contentPath(post.kind, post.slug)}?comment=${comment.id}#comment-${comment.id}`}>链接 ↗</a></div>
            {comment.parentId && <small>回复 {comment.parentAuthorName || "原评论"}</small>}
            <CommentMarkdown>{comment.body}</CommentMarkdown>
            {user && <button aria-label={`回复 ${comment.authorName}`} onClick={() => { setEditingComment(null); setBody(""); setReplyTo({ postID: post.id, id: comment.id, authorName: comment.authorName }); commentInputRef.current?.focus(); }} type="button">回复</button>}
          </article>)}
          {comments.total > comments.pageSize && <nav aria-label="评论分页" className="pagination">
            {comments.page > 1 && <Link to={`?commentsPage=${comments.page - 1}#comments-title`}>← 上一页</Link>}
            {comments.page * comments.pageSize < comments.total && <Link to={`?commentsPage=${comments.page + 1}#comments-title`}>下一页 →</Link>}
          </nav>}
          {user && ownComments.length > 0 && <section aria-labelledby="my-comments-title" className="my-comments">
            <h3 id="my-comments-title">我的评论进度</h3>
            <p>这些评论目前只有你和管理员可见。提交后 10 分钟内可以修改。</p>
            {ownComments.map((comment) => <article className="my-comment" key={comment.id}>
              <div className="comment-heading"><strong>{comment.authorName}</strong><time dateTime={comment.createdAt}>{formatDateTime(comment.createdAt)}</time><span className={comment.status === "rejected" ? "my-comment-rejected" : "my-comment-pending"}>{comment.status === "rejected" ? "未通过" : "待审核"}</span></div>
              {comment.parentId && <small>回复 {comment.parentAuthorName || "原评论"}</small>}
              <CommentMarkdown>{comment.body}</CommentMarkdown>
              {Date.now() - new Date(comment.createdAt).getTime() < 10 * 60 * 1000 && <button onClick={() => { setEditingComment({ postID: post.id, id: comment.id }); setReplyTo(null); setBody(comment.body); setCommentPreview(false); commentInputRef.current?.scrollIntoView({ block: "center" }); commentInputRef.current?.focus(); }} type="button">修改评论</button>}
            </article>)}
            {ownTotal > ownComments.length && <p>仅显示最近 50 条。</p>}
          </section>}
          {user && myCommentsError && <p className="comment-message" role="status">{myCommentsError}</p>}
          {user ? <form className="comment-form" onSubmit={submitComment}>
            <label htmlFor="comment-body">{activeEdit ? "修改评论" : "写下你的评论"}</label>
            {activeEdit && <p>修改后将重新等待审核。<button onClick={() => { setEditingComment(null); setBody(""); setCommentPreview(false); }} type="button">取消修改</button></p>}
            {activeReply && <p>正在回复 {activeReply.authorName} <button onClick={() => setReplyTo(null)} type="button">取消回复</button></p>}
            <textarea id="comment-body" maxLength={2000} onChange={(event) => setBody(event.target.value)} ref={commentInputRef} required rows={5} value={body} />
            <p className="comment-help">支持粗体、链接、列表、引用和代码等 Markdown 格式。图片只显示替代文字。</p>
            <button aria-controls="comment-preview" aria-expanded={commentPreview} className="comment-preview-toggle" disabled={!body.trim()} onClick={() => setCommentPreview((open) => !open)} type="button">{commentPreview ? "收起预览" : "预览评论"}</button>
            <section aria-label="评论预览" className="comment-preview" hidden={!commentPreview} id="comment-preview"><CommentMarkdown>{body}</CommentMarkdown></section>
            <button className="comment-submit" disabled={submitting} type="submit">{submitting ? "提交中…" : activeEdit ? "保存修改" : "提交评论"}</button>
          </form> : <p className="comment-login"><Link to={commentLoginPath}>登录</Link>后参与讨论。</p>}
          {commentMessage && <p className="comment-message" role="status">{commentMessage}</p>}
        </section>
      </main>
      <SiteFooter />
      {post.kind !== "thought" && readingProgress > 10 && <button aria-label="返回顶部" className="read-to-top" onClick={() => window.scrollTo({ top: 0, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" })} title="返回顶部" type="button"><span aria-hidden="true">↑</span><span aria-hidden="true">{readingProgress}%</span></button>}
      {selectionQuote && <button className="selection-quote" onClick={quoteInComment} onPointerDown={(event) => event.preventDefault()} style={{ left: selectionQuote.x, top: selectionQuote.y }} type="button">引用到评论</button>}
    </div>
  );
}
