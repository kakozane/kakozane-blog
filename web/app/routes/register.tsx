import { useState, type FormEvent } from "react";
import { Link, useSearchParams } from "react-router";

import { login, register } from "../lib/auth";
import { authPagePath, safeReturnPath } from "../lib/auth-return";
import type { Route } from "./+types/register";

export function meta({ matches }: Route.MetaArgs) { return [{ title: `注册 · ${matches[0].loaderData.site.title}` }]; }

export default function Register() {
  const [search] = useSearchParams();
  const next = safeReturnPath(search.get("next"), "/account");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const username = String(form.get("username") ?? "").trim().toLowerCase();
    const displayName = String(form.get("displayName") ?? "").trim();
    const password = String(form.get("password") ?? "");
    if (password !== form.get("confirmPassword")) { setError("两次输入的密码不一致"); return; }
    setPending(true);
    setError("");
    try {
      await register({ username, displayName, password });
      await login({ username, password });
      window.location.assign(next);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "注册失败"); }
    finally { setPending(false); }
  }

  return (
    <main className="auth-page">
      <div className="auth-panel">
        <Link className="auth-back" to={search.has("next") ? safeReturnPath(search.get("next")) : "/"}>← 返回博客</Link>
        <h1>创建账号</h1>
        <p className="auth-intro">注册后可以参与讨论。评论发布前会经过审核。</p>
        <form className="auth-form" onSubmit={submit}>
          <div className="auth-field"><label htmlFor="username">账号</label><input autoComplete="username" id="username" maxLength={64} minLength={3} name="username" pattern="[a-z0-9_]+" required /></div>
          <div className="auth-field"><label htmlFor="displayName">昵称</label><input id="displayName" maxLength={100} name="displayName" required /></div>
          <div className="auth-field"><label htmlFor="password">密码（至少 8 位）</label><input autoComplete="new-password" id="password" minLength={8} name="password" required type="password" /></div>
          <div className="auth-field"><label htmlFor="confirmPassword">确认密码</label><input autoComplete="new-password" id="confirmPassword" minLength={8} name="confirmPassword" required type="password" /></div>
          {error && <p className="auth-error" role="alert">{error}</p>}
          <button className="auth-submit" disabled={pending} type="submit">{pending ? "注册中…" : "注册并登录"}</button>
        </form>
        <p className="auth-switch">已有账号？<Link to={search.has("next") ? authPagePath("login", next) : "/login"}>去登录</Link></p>
      </div>
    </main>
  );
}
