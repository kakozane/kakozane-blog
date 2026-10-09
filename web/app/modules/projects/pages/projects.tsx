import type { loadProjects } from "../loaders/projects.server";
import { useLoaderData } from "react-router";
import { SiteFooter } from "../../../layouts/site-footer";
import { SiteHeader } from "../../../layouts/site-header";

export default function Projects() {
  const items = useLoaderData<typeof loadProjects>();
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
