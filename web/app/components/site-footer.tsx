import { Link, useRouteLoaderData } from "react-router";

import { AmbientEffect } from "./ambient-effect";
import type { Site } from "../types/site";

export function SiteFooter() {
  const { site } = useRouteLoaderData("root") as { site: Site };

  return (
    <footer className="site-footer">
      <div className="footer-inner">
        <div className="footer-signature"><Link to="/">{site.title}</Link><p>{site.tagline}</p><span>© {new Date().getFullYear()} {site.title}</span></div>
        <nav aria-label="页脚导航">
          <Link to="/about">关于</Link>
          <Link to="/subscribe">订阅</Link>
          <a href="/feed.xml">RSS</a>
          {site.githubUrl && <a href={site.githubUrl} rel="noopener noreferrer" target="_blank">GitHub</a>}
          <AmbientEffect />
        </nav>
        <div id="footer-presence" />
      </div>
    </footer>
  );
}
