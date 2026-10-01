import { useState, type FormEvent } from "react";
import { redirect, useLoaderData } from "react-router";

import { SiteHeader } from "../components/site-header";
import { changePassword, updateProfile } from "../lib/auth";
import { frontUser } from "../lib/auth.server";
import type { Route } from "./+types/account";

export function meta() { return [{ title: "我的账号 · Kakozane" }]; }

export async function loader({ request }: Route.LoaderArgs) {
  return (await frontUser(request)) ?? redirect("/login");
}

export default function Account() {
  const user = useLoaderData<typeof loader>();
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
        <p className="eyebrow">ACCOUNT</p>
        <h1>我的账号</h1>
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
    </div>
  );
}
