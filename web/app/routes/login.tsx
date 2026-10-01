import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router";

import { Button } from "../components/ui/button";
import { login } from "../lib/auth";

export function meta() {
  return [{ title: "登录 · Kakozane" }];
}

export default function Login() {
  const navigate = useNavigate();
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
      navigate("/", { replace: true });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "登录失败，请稍后重试");
    } finally {
      setPending(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-12">
      <Link className="mb-10 text-sm text-muted-foreground hover:text-foreground" to="/">
        ← 返回博客
      </Link>
      <h1 className="text-3xl font-semibold tracking-tight">登录博客</h1>
      <p className="mt-2 text-sm text-muted-foreground">使用你的博客账号继续。</p>
      <form className="mt-8 space-y-5" onSubmit={submit}>
        <div>
          <label className="mb-2 block text-sm font-medium" htmlFor="username">账号</label>
          <input className="w-full rounded-lg border border-border bg-background px-3 py-2 outline-none focus-visible:ring-2 focus-visible:ring-ring" id="username" name="username" autoComplete="username" maxLength={64} required />
        </div>
        <div>
          <label className="mb-2 block text-sm font-medium" htmlFor="password">密码</label>
          <input className="w-full rounded-lg border border-border bg-background px-3 py-2 outline-none focus-visible:ring-2 focus-visible:ring-ring" id="password" name="password" type="password" autoComplete="current-password" required />
        </div>
        {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
        <Button className="h-10 w-full" disabled={pending} type="submit">
          {pending ? "登录中…" : "登录"}
        </Button>
      </form>
    </main>
  );
}
