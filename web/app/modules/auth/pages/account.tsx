import type { loadAccount } from "../loaders/account.server";
import { NotificationInbox } from "../../notifications/components/notification-inbox";
import { useState, type FormEvent } from "react";
import { Link, useLoaderData } from "react-router";
import { SiteHeader } from "../../../layouts/site-header";
import { SiteFooter } from "../../../layouts/site-footer";
import { changePassword, updateProfile } from "../api/auth";
import { contentLabel, contentPath } from "../../articles/lib/content-path";
import { formatDate } from "../../../shared/lib/date";

export default function Account() {
  const { user, likes } = useLoaderData<typeof loadAccount>();
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function saveName(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    const form = new FormData(event.currentTarget);
    try {
      await updateProfile(String(form.get("displayName") ?? ""));
      window.location.reload();
    } catch (cause) { setMessage(cause instanceof Error ? cause.message : "保存失败"); }
    finally { setBusy(false); }
  }

  async function savePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    const form = new FormData(event.currentTarget);
    const next = String(form.get("newPassword") ?? "");
    if (next !== form.get("confirmPassword")) {
      setMessage("两次输入的新密码不一致");
      setBusy(false);
      return;
    }
    try {
      await changePassword(String(form.get("oldPassword") ?? ""), next);
      window.location.assign("/login");
    } catch (cause) { setMessage(cause instanceof Error ? cause.message : "修改失败"); }
    finally { setBusy(false); }
  }

  return (
    <div className="site-shell">
      <SiteHeader />
      <main className="simple-page account-page">
        <h1>我的账号</h1>
        <NotificationInbox />
        <p>账号：{user.username}</p>
        {message && <p className="account-message" role="alert">{message}</p>}
        <section>
          <h2>个人资料</h2>
          <form onSubmit={saveName}>
            <label htmlFor="displayName">昵称</label>
            <input defaultValue={user.displayName} id="displayName" maxLength={100} name="displayName" required />
            <button disabled={busy} type="submit">保存昵称</button>
          </form>
        </section>
        <section aria-labelledby="account-likes-title" id="liked">
          <h2 id="account-likes-title">我喜欢的内容{likes && <span className="account-likes-count">{likes.total}</span>}</h2>
          {likes === null ? <p className="account-likes-empty">暂时无法读取喜欢的内容，请稍后刷新。</p> : likes.items.length === 0 ? <p className="account-likes-empty">点过赞的公开内容会显示在这里。</p> : <ol className="account-likes-list">{likes.items.map((item) => <li key={`${item.kind}-${item.slug}`}><div><span>{contentLabel(item.kind)}</span><Link to={contentPath(item.kind, item.slug)}>{item.title}</Link></div><time dateTime={item.likedAt}>{formatDate(item.likedAt, true)}</time></li>)}</ol>}
          {likes && likes.total > likes.pageSize && <nav aria-label="喜欢内容分页" className="pagination">{likes.page > 1 ? <Link to={`/account?likesPage=${likes.page - 1}#liked`}>← 上一页</Link> : <span />}{likes.page * likes.pageSize < likes.total ? <Link to={`/account?likesPage=${likes.page + 1}#liked`}>下一页 →</Link> : <span />}</nav>}
        </section>
        <section>
          <h2>修改密码</h2>
          <form onSubmit={savePassword}>
            <label htmlFor="oldPassword">当前密码</label>
            <input autoComplete="current-password" id="oldPassword" name="oldPassword" required type="password" />
            <label htmlFor="newPassword">新密码（至少 8 位）</label>
            <input autoComplete="new-password" id="newPassword" minLength={8} name="newPassword" required type="password" />
            <label htmlFor="confirmPassword">确认新密码</label>
            <input autoComplete="new-password" id="confirmPassword" minLength={8} name="confirmPassword" required type="password" />
            <button disabled={busy} type="submit">修改密码</button>
          </form>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
