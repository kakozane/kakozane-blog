import { Link } from "react-router";

import { formatDate } from "../lib/date";
import type { Post } from "../types/content";

export function PostList({ posts }: { posts: Post[] }) {
  if (posts.length === 0) {
    return <div className="empty-posts">这里还没有文章。第一篇正在准备中。</div>;
  }
  return (
    <div className="post-list">
      {posts.map((post) => (
        <article className="post-card" key={post.id}>
          <div className="post-meta">
            <time dateTime={post.publishedAt ?? post.createdAt}>
              {formatDate(post.publishedAt ?? post.createdAt, true)}
            </time>
            {post.categoryName && <Link to={`/?category=${encodeURIComponent(post.categorySlug)}`}>{post.categoryName}</Link>}
          </div>
          <h3><Link to={`/posts/${encodeURIComponent(post.slug)}`}>{post.title}</Link></h3>
          {post.excerpt && <p>{post.excerpt}</p>}
          <Link className="read-more" to={`/posts/${encodeURIComponent(post.slug)}`}>阅读文章 <span aria-hidden>↗</span></Link>
        </article>
      ))}
    </div>
  );
}
