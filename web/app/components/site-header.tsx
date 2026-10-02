import { useEffect, useState } from "react";
import { Link, NavLink, useLocation, useRevalidator, useRouteLoaderData } from "react-router";

import { logout } from "../lib/auth";
import { authPagePath } from "../lib/auth-return";
import { isSearchShortcut } from "../lib/search-shortcut";
import { contentLabel, contentPath } from "../lib/content-path";
import { ThemeSwitch } from "./theme-switch";
import { SearchDialog } from "./search-dialog";
import type { PublicUser } from "../types/auth";
import type { Site } from "../types/site";
import type { Post } from "../types/content";

const primaryNavItems = [
  { to: "/", label: "首页" },
  { to: "/posts", label: "文章" },
  { to: "/notes", label: "手记" },
  { to: "/thinking", label: "思考" },
  { to: "/timeline", label: "时间线" },
];

const secondaryNavItems = [
  { to: "/says", label: "一言" },
  { to: "/topics", label: "话题" },
  { to: "/pages", label: "页面" },
  { to: "/subscribe", label: "订阅" },
  { to: "/about", label: "关于" },
  { to: "/friends", label: "友链" },
  { to: "/projects", label: "项目" },
];

export function SiteHeader() {
  const location = useLocation();
  const { user, site } = useRouteLoaderData("root") as { user: PublicUser | null; site: Site };
  const { revalidate } = useRevalidator();
  const [error, setError] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [announcement, setAnnouncement] = useState<{ kind: Post["kind"]; title: string; slug: string } | null>(null);
  const moreItems = [...secondaryNavItems, ...(site.navLinks ?? []).map(({ label, href }) => ({ to: href, label })), ...(user ? [{ to: "/account", label: "我的账号" }] : [])];
  const links = [...primaryNavItems, ...moreItems];
  const moreActive = moreItems.some(({ to }) => location.pathname === to || location.pathname.startsWith(`${to}/`));

  useEffect(() => {
    function openSearch(event: KeyboardEvent) {
      if (!isSearchShortcut(event)) return;
      event.preventDefault();
      setSearchOpen(true);
    }
    window.addEventListener("keydown", openSearch);
    return () => window.removeEventListener("keydown", openSearch);
  }, []);

  useEffect(() => {
    const source = new EventSource("/api/v1/events");
    function published(event: Event) {
      try {
        const data: unknown = JSON.parse((event as MessageEvent).data);
        if (data && typeof data === "object" && "kind" in data && "title" in data && "slug" in data &&
          (data.kind === "post" || data.kind === "note" || data.kind === "thought") && typeof data.title === "string" && typeof data.slug === "string") {
          setAnnouncement({ kind: data.kind, title: data.title, slug: data.slug });
        }
      } catch { /* 忽略无法识别的消息。 */ }
    }
    function siteChanged() { void revalidate(); }
    source.addEventListener("published", published);
    source.addEventListener("site", siteChanged);
    return () => source.close();
  }, [revalidate]);

  useEffect(() => {
    if (!site.statusUntil) return;
    const expiresAt = new Date(site.statusUntil).getTime();
    if (!Number.isFinite(expiresAt)) return;
    let timer: number;
    function refreshWhenExpired() {
      const remaining = expiresAt - Date.now();
      if (remaining <= 0) { void revalidate(); return; }
      timer = window.setTimeout(refreshWhenExpired, Math.min(remaining, 86_400_000));
    }
    refreshWhenExpired();
    return () => window.clearTimeout(timer);
  }, [site.statusUntil, revalidate]);

  async function signOut() {
    try {
      await logout();
      window.location.assign("/");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "退出失败");
    }
  }

  return (
    <>
    <header className="site-header">
      <Link className="site-logo" title={site.title} to="/">{site.avatarUrl && <img alt="" src={site.avatarUrl} />}<span>{site.title}</span></Link>
      <nav aria-label="主导航" className="site-nav">
        {primaryNavItems.map((item) => <NavLink end={item.to === "/"} key={item.to} to={item.to}>{item.label}</NavLink>)}
        <details className="site-nav-more"><summary aria-current={moreActive ? "page" : undefined}>更多</summary><div className="site-nav-more-panel">{moreItems.map((item, index) => item.to.startsWith("https://") ? <a href={item.to} key={`${item.to}-${index}`} onClick={(event) => event.currentTarget.closest("details")?.removeAttribute("open")} rel="noopener noreferrer" target="_blank">{item.label} ↗</a> : <NavLink key={`${item.to}-${index}`} onClick={(event) => event.currentTarget.closest("details")?.removeAttribute("open")} to={item.to}>{item.label}</NavLink>)}</div></details>
      </nav>
      <div className="site-actions"><button aria-keyshortcuts="Meta+K Control+K" aria-label="快速搜索" className="site-search-trigger" onClick={() => setSearchOpen(true)} title="快速搜索（⌘K / Ctrl+K）" type="button"><svg aria-hidden="true" fill="none" height="18" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" viewBox="0 0 24 24" width="18"><circle cx="10.8" cy="10.8" r="6.8" /><path d="m16 16 4.5 4.5" /></svg></button><ThemeSwitch />{user ? <button className="site-login" onClick={signOut} type="button">退出</button> : <Link className="site-login" to={authPagePath("login", `${location.pathname}${location.search}${location.hash}`)}>登录</Link>}
        <details className="site-menu"><summary>菜单</summary><nav aria-label="小屏导航" className="site-menu-panel">{links.map((item, index) => item.to.startsWith("https://") ? <a href={item.to} key={`${item.to}-${index}`} onClick={(event) => event.currentTarget.closest("details")?.removeAttribute("open")} rel="noopener noreferrer" target="_blank">{item.label} ↗</a> : <NavLink end={item.to === "/"} key={`${item.to}-${index}`} onClick={(event) => event.currentTarget.closest("details")?.removeAttribute("open")} to={item.to}>{item.label}</NavLink>)}</nav></details>
      </div>
    </header>
    <SearchDialog onClose={() => setSearchOpen(false)} open={searchOpen} />
    {announcement && <div className="site-announcement" role="status"><span>刚发布{contentLabel(announcement.kind)}：</span><Link to={contentPath(announcement.kind, announcement.slug)}>{announcement.title}</Link><button aria-label="关闭新内容提醒" onClick={() => setAnnouncement(null)} type="button">×</button></div>}
    {error && <p className="site-error" role="alert">{error}</p>}
    </>
  );
}
