import { useLoaderData } from "react-router";

import { SiteFooter } from "../components/site-footer";
import { SiteHeader } from "../components/site-header";
import { getProjects } from "../lib/projects.server";
import type { Route } from "./+types/projects";

export function meta({ matches }: Route.MetaArgs) { return [{ title: `项目 · ${matches[0].loaderData.site.title}` }, { name: "description", content: "我做过和正在做的项目。" }]; }
export async function loader() { return getProjects(); }

export default function Projects() {
  const items = useLoaderData<typeof loader>();
  return <div className="site-shell">
    <SiteHeader />
    <main className="simple-page projects-page">
      <div className="page-intro"><h1>项目</h1><p>我做过和正在做的项目。</p></div>
      {items.length === 0 && <p className="empty-posts">这里还没有公开的项目。</p>}
      <div className="projects-list">{items.map((item) => <a className="external-link" href={item.url} key={item.id} rel="noopener noreferrer" target="_blank">
        {item.avatarUrl && <img alt="" height="44" loading="lazy" src={item.avatarUrl} width="44" />}
        <span className="external-link-copy"><strong>{item.name}</strong>{item.description && <small>{item.description}</small>}</span>
        <span aria-hidden="true" className="external-link-arrow">↗</span>
      </a>)}</div>
    </main>
    <SiteFooter />
  </div>;
}
