import { contentPath } from "../lib/content-path";
import { Link } from "react-router";

import { formatDate } from "../../../shared/lib/date";
import type { PostView } from "../lib/posts-options";
import type { Post } from "../types/article";

export function PostList({ posts, view = "preview" }: { posts: Post[]; view?: PostView }) {
  if (posts.length === 0) {
    return <div className="empty-posts">暂无文章</div>;
  }
  return (
    <div className="post-list" data-view={view}>
      {posts.map((post) => (
        <article className="post-card" key={post.id}>
          <div className="post-card-content">
            <div className="post-card-copy">
              <div className="post-meta">
                <time dateTime={post.publishedAt ?? post.createdAt}>
                  {formatDate(post.publishedAt ?? post.createdAt, true)}
                </time>
                {post.pinned && <><span aria-hidden="true">·</span><span className="post-pinned">置顶</span></>}
                {post.categoryName && <><span aria-hidden="true">·</span><Link to={`/categories/${encodeURIComponent(post.categorySlug)}`}>{post.categoryName}</Link></>}
              </div>
              <h3><Link to={contentPath(post.kind, post.slug)}>{post.title}</Link></h3>
              {view === "preview" && post.excerpt && <p>{post.excerpt}</p>}
            </div>
            {view === "preview" && post.coverUrl && <Link aria-label={`阅读 ${post.title}`} className="post-thumb" to={contentPath(post.kind, post.slug)}><img alt="" loading="lazy" src={post.coverUrl} /></Link>}
          </div>
        </article>
      ))}
    </div>
  );
}
