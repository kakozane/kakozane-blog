import {
  isRouteErrorResponse,
  Links,
  Link,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useLocation,
  useRouteLoaderData,
} from "react-router";

import type { Route } from "./+types/root";
import "./styles/yohaku-tokens.css";
import "./styles/app.css";
import "./styles/editorial.css";
import { AuthDialog } from "./modules/auth/components/auth-dialog";
import { PageMotion } from "./shared/components/page-motion";
import { frontUser } from "./modules/auth/api/auth.server";
import { getSite } from "./modules/site/api/site.server";
import { sectionMeta } from "./modules/site/lib/section-meta";
import { SiteHeader } from "./layouts/site-header";
import { SiteFooter } from "./layouts/site-footer";
import type { Site } from "./modules/site/types/site";

export async function loader({ request }: Route.LoaderArgs) {
  const [user, site] = await Promise.all([frontUser(request), getSite()]);
  return { user, site };
}

export function Layout({ children }: { children: React.ReactNode }) {
  const root = useRouteLoaderData("root") as { site: Site } | undefined;
  const location = useLocation();
  const section = root && sectionMeta(root.site, location.pathname, location.search);
  return (
    <html lang="zh-CN">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href={root?.site.faviconUrl || "/favicon.svg"} />
        {section?.canonical && <link rel="canonical" href={section.canonical} />}
        {section?.noindex && <meta name="robots" content="noindex,follow" />}
        {section && <>
          <meta property="og:type" content="website" />
          <meta property="og:site_name" content={root.site.title} />
          <meta property="og:title" content={section.title} />
          <meta property="og:description" content={section.description} />
          <meta property="og:url" content={section.ogURL} />
          {root.site.avatarUrl && <meta property="og:image" content={new URL(root.site.avatarUrl, root.site.siteUrl).href} />}
          <meta name="twitter:card" content="summary" />
        </>}
        <Meta />
        <script dangerouslySetInnerHTML={{ __html: 'try{let t=localStorage.getItem("blog-theme");if(t==="light"||t==="dark")document.documentElement.dataset.theme=t}catch{}' }} />
        <link rel="alternate" type="application/rss+xml" title="博客 RSS" href="/feed.xml" />
        <Links />
      </head>
      <body>
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  return <><Outlet /><AuthDialog /><PageMotion /></>;
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  const root = useRouteLoaderData("root") as { site: Site } | undefined;
  const notFound = isRouteErrorResponse(error) && error.status === 404;
  const details = notFound ? "这个地址没有对应的内容，可以从首页重新开始。" : "页面暂时无法打开，请稍后重试。";
  const stack = import.meta.env.DEV && error instanceof Error ? error.stack : undefined;

  return <>
  <title>{`${notFound ? "页面不存在" : "页面暂不可用"} · ${root?.site.title ?? "Kakozane"}`}</title>
  <meta content="noindex" name="robots" />
  <div className="site-shell">
    {root ? <SiteHeader /> : <header className="site-header"><Link className="site-logo" to="/">Kakozane</Link></header>}
    <main className="error-page">
      <span className="error-code">{notFound ? "404" : "暂时离线"}</span>
      <h1>{notFound ? "这里还没有内容。" : "页面暂时无法打开。"}</h1>
      <p>{details}</p>
      <div className="error-actions"><Link to="/">返回首页</Link>{notFound ? <Link to="/search">搜索内容 ↗</Link> : <button onClick={() => window.location.reload()} type="button">重新加载 ↗</button>}</div>
      {stack && <details className="error-stack"><summary>开发诊断信息</summary><pre>{stack}</pre></details>}
    </main>
    {root && <SiteFooter />}
  </div>
  </>;
}
