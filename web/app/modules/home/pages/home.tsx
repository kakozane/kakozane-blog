import type { loadHome } from "../loaders/home.server";
import { Link, useLoaderData, useRouteLoaderData } from "react-router";
import { Heart, MessageCircle, PenLine } from "lucide-react";
import { PostList } from "../../articles/components/post-list";
import { SiteFooter } from "../../../layouts/site-footer";
import { SiteHeader } from "../../../layouts/site-header";
import { formatDate } from "../../../shared/lib/date";
import { contentLabel, contentPath } from "../../articles/lib/content-path";
import { commentActivityHref, commentActivityPreview } from "../lib/home-activity";
import { taglinePhrases } from "../lib/tagline";
import { jsonLd, websiteData } from "../../articles/lib/structured-data";
import type { Site } from "../../site/types/site";

const destinations = [
  { to: "/archive", name: "归档", detail: "按时间回看" },
  { to: "/about", name: "关于", detail: "认识博主" },
  { to: "/friends", name: "友链", detail: "常去的地方" },
  { to: "/projects", name: "项目", detail: "做过的东西" },
];

export default function Home() {
  const { posts, activity, months, stats, query, category, tag } = useLoaderData<typeof loadHome>();
  const { site } = useRouteLoaderData("root") as { site: Site };
  const monthlyTotal = months.reduce((sum, month) => sum + month.count, 0);
  const showYearlineBars = months.filter((month) => month.count > 0).length > 1;
  const peak = Math.max(1, ...months.map((month) => month.count));
  const recentActivity = activity.length > 0 && <aside className="home-activity" aria-labelledby="home-activity-title">
    <div className="section-heading"><h2 id="home-activity-title">最近动态</h2></div>
    <ol className="home-activity-list">{activity.map((item) => {
      const content = item.type === "comment" ? <>
        <p><strong>{item.comment.authorName}</strong><span> 评论了{contentLabel(item.comment.kind)} · </span><Link to={commentActivityHref(item.comment)}>{item.comment.title}</Link></p>
        <small className="home-activity-quote">{commentActivityPreview(item.comment.body)}</small>
      </> : item.type === "like" ? <>
        <p><span>有人喜欢了{contentLabel(item.like.kind)} · </span><Link to={contentPath(item.like.kind, item.like.slug)}>{item.like.title}</Link></p>
      </> : <>
        <p><span>发布了{contentLabel(item.post.kind)} · </span><Link to={contentPath(item.post.kind, item.post.slug)}>{item.post.title}</Link></p>
        {item.post.kind === "thought" && item.post.excerpt && <small>{item.post.excerpt}</small>}
      </>;
      return <li key={`${item.type}-${item.id}`}><span aria-hidden="true" className="home-activity-icon">{item.type === "comment" ? <MessageCircle /> : item.type === "like" ? <Heart /> : <PenLine />}</span><div>
        <time dateTime={item.at}>{formatDate(item.at, true)}</time>
        {content}
      </div></li>;
    })}</ol>
    <Link className="section-more" to="/archive">更多发布内容 ↗</Link>
  </aside>;
  return (
    <div className="site-shell">
      <script dangerouslySetInnerHTML={{ __html: jsonLd(websiteData(site)) }} type="application/ld+json" />
      <SiteHeader />
      <main>
        <section className="hero">
          <div className="hero-inner">
            <div className="hero-copy">
              <div className="hero-avatar">{site.avatarUrl ? <img alt={`${site.title} 的头像`} src={site.avatarUrl} /> : <span aria-hidden="true">{site.title.slice(0, 1)}</span>}</div>
              <h1>你好，我是 <span>{site.title}</span><span className="hero-wave" aria-hidden="true"> 👋</span></h1>
              <p className="hero-label">{taglinePhrases(site.tagline).map((phrase, index) => <span className="hero-phrase" key={index}>{phrase}</span>)}</p>
              <p className="hero-description">{site.description}</p>
              {site.statusText && <p className="hero-status"><span aria-hidden="true">{site.statusEmoji}</span><span>近况</span><strong>{site.statusText}</strong></p>}
              <div className="hero-links"><Link to="/posts">阅读文章 <span aria-hidden="true">↗</span></Link><Link to="/about">关于这个博客 <span aria-hidden="true">↗</span></Link>{site.githubUrl && <a href={site.githubUrl} rel="noopener noreferrer" target="_blank">GitHub ↗</a>}</div>
              {stats.posts + stats.notes + stats.thoughts > 0 && <dl aria-label="博客记录" className="hero-stats">
                <div><dt>文章</dt><dd>{(stats.posts + stats.notes + stats.thoughts).toLocaleString("zh-CN")}</dd></div>
                {stats.firstPublishedAt && <div><dt>开始于</dt><dd><time dateTime={stats.firstPublishedAt}>{formatDate(stats.firstPublishedAt, true)}</time></dd></div>}
              </dl>}
            </div>
          </div>
        </section>
        <div className="home-content">
        <section className="content-section" aria-labelledby="latest-title">
          <div className="section-heading">
            <h2 id="latest-title">最近写作</h2>
            <Link className="section-more" to="/posts">全部文章 ↗</Link>
          </div>
          <PostList posts={posts.items} view="compact" />
          {posts.total > posts.pageSize && (
            <nav aria-label="文章分页" className="pagination">
              {posts.page > 1 && <Link to={`/?page=${posts.page - 1}${query ? `&q=${encodeURIComponent(query)}` : ""}${category ? `&category=${encodeURIComponent(category)}` : ""}${tag ? `&tag=${encodeURIComponent(tag)}` : ""}`}>← 上一页</Link>}
              <span>第 {posts.page} 页</span>
              {posts.page * posts.pageSize < posts.total && <Link to={`/?page=${posts.page + 1}${query ? `&q=${encodeURIComponent(query)}` : ""}${category ? `&category=${encodeURIComponent(category)}` : ""}${tag ? `&tag=${encodeURIComponent(tag)}` : ""}`}>下一页 →</Link>}
            </nav>
          )}
        </section>
        {recentActivity}
        </div>
        {monthlyTotal > 0 && <section aria-labelledby="home-yearline-title" className={`home-yearline${showYearlineBars ? "" : " is-sparse"}`}>
          <div className="section-heading"><h2 id="home-yearline-title">发布足迹</h2><Link className="section-more" to="/archive">查看归档 ↗</Link></div>
          <p>过去 12 个月公开了 {monthlyTotal} 条内容。</p>
          {showYearlineBars && <div className="home-yearline-scroll"><ol className="home-yearline-bars">{months.map((month) => {
            const label = `${month.month}，${month.count} 条公开内容`;
            const marker = <><span aria-hidden="true" className={`home-yearline-bar${month.count ? "" : " is-empty"}`} style={{ height: `${month.count ? Math.max(8, Math.round(month.count / peak * 88)) : 3}px` }} /><time aria-hidden="true" dateTime={`${month.month}-01`}>{Number(month.month.slice(5))}月</time></>;
            return <li key={month.month}>{month.count ? <Link aria-label={label} title={label} to={`/archive?month=${month.month}`}>{marker}</Link> : <span title={label}>{marker}<span className="sr-only">{label}</span></span>}</li>;
          })}</ol></div>}
        </section>}
        <nav aria-label="继续探索" className="home-explore"><div className="home-explore-inner">
          <div className="section-heading"><h2>在这里，也可以找到</h2></div>
          <ul>{destinations.map((item) => <li key={item.to}><Link to={item.to}><span><strong>{item.name}</strong><small>{item.detail}</small></span><span aria-hidden="true">↗</span></Link></li>)}</ul>
        </div></nav>
      </main>
      <SiteFooter />
    </div>
  );
}
