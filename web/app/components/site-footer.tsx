import { Link, useRouteLoaderData } from "react-router";

import type { Site } from "../types/site";

export function SiteFooter() {
  const { site } = useRouteLoaderData("root") as { site: Site };

  return (
    <footer className="site-footer">
      <div className="footer-inner">
        <span>© {new Date().getFullYear()} {site.title}</span>
        <nav aria-label="页脚导航">
          <Link to="/about">关于</Link>
          <Link to="/subscribe">订阅</Link>
          <a href="/feed.xml">RSS</a>
          {site.githubUrl && <a href={site.githubUrl} rel="noopener noreferrer" target="_blank">GitHub</a>}
        </nav>
      </div>
    </footer>
  );
}
