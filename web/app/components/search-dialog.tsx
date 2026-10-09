import { useEffect, useRef, useState } from "react";
import { Form, Link } from "react-router";

import { searchPreview, type SearchPreviewItem } from "../lib/search-preview";
import type { PostList } from "../types/content";
import type { Page } from "../types/page";

type SearchState = { term: string; items: SearchPreviewItem[]; total: number; error: string };

export function SearchDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [state, setState] = useState<SearchState>({ term: "", items: [], total: 0, error: "" });
  const term = Array.from(query.trim()).slice(0, 100).join("");

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) { dialog.showModal(); inputRef.current?.focus(); }
    if (!open && dialog.open) dialog.close();
  }, [open]);

  useEffect(() => {
    if (!open || !term) return;
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      try {
        const params = new URLSearchParams({ q: term });
        const [postResponse, pageResponse] = await Promise.all([
          fetch(`/api/v1/timeline?${params}&pageSize=8`, { signal: controller.signal }),
          fetch(`/api/v1/pages?${params}`, { signal: controller.signal }),
        ]);
        if (!postResponse.ok || !pageResponse.ok) throw new Error("搜索失败");
        const [posts, pages] = await Promise.all([
          postResponse.json() as Promise<PostList>,
          pageResponse.json() as Promise<{ items: Page[] }>,
        ]);
        if (!controller.signal.aborted) setState({ term, items: searchPreview(posts.items, pages.items), total: posts.total + pages.items.length, error: "" });
      } catch {
        if (!controller.signal.aborted) setState({ term, items: [], total: 0, error: "暂时无法搜索，请稍后重试。" });
      }
    }, 180);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [open, term]);

  return <dialog aria-labelledby="quick-search-title" className="quick-search" onClick={(event) => { if (event.target === event.currentTarget) event.currentTarget.close(); }} onClose={() => { setQuery(""); setState({ term: "", items: [], total: 0, error: "" }); onClose(); }} onKeyDown={(event) => {
    if (event.nativeEvent.isComposing) return;
    if (event.key === "Escape") { event.preventDefault(); event.currentTarget.close(); return; }
    if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
    const links = Array.from(event.currentTarget.querySelectorAll<HTMLAnchorElement>(".quick-search-results a"));
    if (!links.length) return;
    const current = links.indexOf(document.activeElement as HTMLAnchorElement);
    const next = event.key === "ArrowDown" ? (current + 1) % links.length : (current < 0 ? links.length : current) - 1;
    event.preventDefault();
    links[next].focus();
  }} ref={dialogRef}>
    <div className="quick-search-panel">
      <div className="quick-search-heading"><h2 id="quick-search-title">搜索博客</h2><button aria-label="关闭搜索" onClick={() => dialogRef.current?.close()} type="button">×</button></div>
      <Form action="/search" className="quick-search-form" method="get" onSubmit={onClose} role="search">
        <label className="sr-only" htmlFor="quick-search-input">搜索文章和页面</label>
        <input autoComplete="off" id="quick-search-input" maxLength={100} name="q" onChange={(event) => setQuery(event.target.value)} placeholder="搜索文章和页面" ref={inputRef} type="search" value={query} />
        <button type="submit">搜索</button>
      </Form>
      <div aria-live="polite" className="quick-search-results">
        {!term && <p className="quick-search-hint">输入关键词查找已发布的内容。</p>}
        {term && state.term !== term && <p className="quick-search-hint">正在搜索…</p>}
        {term && state.term === term && state.error && <p className="quick-search-hint" role="alert">{state.error}</p>}
        {term && state.term === term && !state.error && state.items.length === 0 && <p className="quick-search-hint">没有找到匹配的内容。</p>}
        {term && state.term === term && !state.error && state.items.length > 0 && <ul>{state.items.map((item) => <li key={item.key}><Link onClick={onClose} to={item.href}><span className="quick-search-item-label">{item.label}</span><span><strong>{item.title}</strong>{item.excerpt && <small>{item.excerpt}</small>}</span><span aria-hidden="true">↗</span></Link></li>)}</ul>}
      </div>
      {term && <Link className="quick-search-all" onClick={onClose} to={`/search?q=${encodeURIComponent(term)}`}>查看全部{state.term === term && !state.error ? ` ${state.total} ` : ""}条结果 ↗</Link>}
      <p className="quick-search-tip">↑ ↓ 选择结果 · Enter 打开 · Esc 关闭</p>
    </div>
  </dialog>;
}
