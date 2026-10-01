import { useState, type FormEvent } from "react";
import { Link } from "react-router";

import { Button } from "../components/ui/button";
import { login, register } from "../lib/auth";

export function meta() { return [{ title: "注册 · Kakozane" }]; }

export default function Register() {
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
      window.location.assign("/account");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "注册失败"); }
    finally { setPending(false); }
  }

  const inputClass = "w-full rounded-lg border border-border bg-background px-3 py-2 outline-none focus-visible:ring-2 focus-visible:ring-ring";
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-12">
      <Link className="mb-10 text-sm text-muted-foreground hover:text-foreground" to="/">← 返回博客</Link>
      <h1 className="text-3xl font-semibold tracking-tight">注册博客账号</h1>
      <p className="mt-2 text-sm text-muted-foreground">注册后可参与文章讨论，评论会先经过审核。</p>
      <form className="mt-8 space-y-5" onSubmit={submit}>
        <div><label className="mb-2 block text-sm font-medium" htmlFor="username">账号</label><input autoComplete="username" className={inputClass} id="username" maxLength={64} minLength={3} name="username" pattern="[a-z0-9_]+" required /></div>
        <div><label className="mb-2 block text-sm font-medium" htmlFor="displayName">昵称</label><input className={inputClass} id="displayName" maxLength={100} name="displayName" required /></div>
        <div><label className="mb-2 block text-sm font-medium" htmlFor="password">密码（至少 8 位）</label><input autoComplete="new-password" className={inputClass} id="password" minLength={8} name="password" required type="password" /></div>
        <div><label className="mb-2 block text-sm font-medium" htmlFor="confirmPassword">确认密码</label><input autoComplete="new-password" className={inputClass} id="confirmPassword" minLength={8} name="confirmPassword" required type="password" /></div>
        {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
        <Button className="h-10 w-full" disabled={pending} type="submit">{pending ? "注册中…" : "注册并登录"}</Button>
      </form>
      <p className="mt-6 text-sm text-muted-foreground">已有账号？<Link className="text-primary" to="/login">去登录</Link></p>
    </main>
  );
}
