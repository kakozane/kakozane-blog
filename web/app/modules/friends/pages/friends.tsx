import type { loadFriends } from "../loaders/friends.server";
import { useLoaderData } from "react-router";
import { SiteFooter } from "../../../layouts/site-footer";
import { SiteHeader } from "../../../layouts/site-header";
import type { FriendLink } from "../types/friend";

function LinkGroup({ title, items }: { title: string; items: FriendLink[] }) {
  if (items.length === 0) return null;
  return <section className="friends-group">
    <h2>{title}</h2>
    <div className="friends-list">{items.map((item) => <a className="external-link" href={item.url} key={item.id} rel="noopener noreferrer" target="_blank">
      {item.avatarUrl ? <img alt="" height="44" loading="lazy" src={item.avatarUrl} width="44" /> : <span className="friend-initial" aria-hidden="true">{item.name.slice(0, 1)}</span>}
      <span className="external-link-copy"><strong>{item.name}</strong>{item.description && <small>{item.description}</small>}</span>
      <span aria-hidden="true" className="external-link-arrow">↗</span>
    </a>)}</div>
  </section>;
}

export default function Friends() {
  const items = useLoaderData<typeof loadFriends>();
  return <div className="site-shell">
    <SiteHeader />
    <main className="simple-page friends-page">
      <div className="page-intro"><h1>友情链接</h1><p>一些常逛的站点，以及想留在这里的好内容。</p></div>
      {items.length === 0 && <p className="empty-posts">这里还没有公开的链接。</p>}
      <LinkGroup title="友站" items={items.filter((item) => item.kind === "friend")} />
      <LinkGroup title="收藏" items={items.filter((item) => item.kind === "collection")} />
    </main>
    <SiteFooter />
  </div>;
}
