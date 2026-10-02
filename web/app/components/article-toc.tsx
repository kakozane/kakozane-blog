import type { ArticleHeading } from "../lib/article-headings";

export function ArticleToc({ headings, label, activeHeading }: { headings: ArticleHeading[]; label: string; activeHeading?: string }) {
  if (headings.length === 0) return null;
  const items = headings.map((heading) => <li className={heading.level === 3 ? "article-toc-nested" : undefined} key={heading.id}><a aria-current={activeHeading === heading.id ? "location" : undefined} href={`#${heading.id}`}>{heading.title}</a></li>);
  return <>
    <nav aria-label={`${label}目录`} className="article-toc"><h2>目录</h2><ol>{items}</ol></nav>
    <details className="article-toc-mobile" onClick={(event) => { if (event.target instanceof HTMLAnchorElement) event.currentTarget.open = false; }} onKeyDown={(event) => { if (event.key === "Escape") { event.currentTarget.open = false; event.currentTarget.querySelector("summary")?.focus(); } }}>
      <summary>目录</summary>
      <nav aria-label={`移动端${label}目录`}><ol>{items}</ol></nav>
    </details>
  </>;
}
