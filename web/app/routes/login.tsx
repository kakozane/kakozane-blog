import { useState, type FormEvent } from "react";
import { Link, redirect } from "react-router";

import { login } from "../lib/auth";
import { SSOPrompt } from "../components/sso-prompt";
import { authPagePath, safeReturnPath } from "../lib/auth-return";
import type { Route } from "./+types/login";

export function meta({ matches }: Route.MetaArgs) {
  return [{ title: `登录 · ${matches[0].loaderData.site.title}` }];
}

export function loader({ request }: Route.LoaderArgs) {
  return redirect(authPagePath("login", safeReturnPath(new URL(request.url).searchParams.get("next"))));
}

export default function AuthForm({ next = "/" }: { next?: string }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setPending(true);
    setError("");
    try {
      await login({
        username: String(form.get("username") ?? ""),
        password: String(form.get("password") ?? ""),
      });
      window.location.assign(next);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "登录失败，请稍后重试");
    } finally {
      setPending(false);
    }
  }

  return (
    <div>
      <div className="auth-panel">
        <h1 id="auth-dialog-title">登录</h1>
        <p className="auth-intro">使用博客账号继续阅读和参与讨论。</p>
        <SSOPrompt returnTo={next} />
        <form className="auth-form" onSubmit={submit}>
          <div className="auth-field"><label htmlFor="username">账号</label><input autoComplete="username" id="username" maxLength={64} name="username" required /></div>
          <div className="auth-field"><label htmlFor="password">密码</label><input autoComplete="current-password" id="password" name="password" required type="password" /></div>
          {error && <p className="auth-error" role="alert">{error}</p>}
          <button className="auth-submit" disabled={pending} type="submit">{pending ? "登录中…" : "登录"}</button>
        </form>
        <p className="auth-switch">还没有账号？<Link preventScrollReset replace to={authPagePath("register", next)}>注册账号</Link></p>
      </div>
    </div>
  );
}
