import { useEffect, useState } from "react";
import { Link } from "react-router";

import { currentUser, logout } from "../lib/auth";
import type { PublicUser } from "../types/auth";

export function meta() {
  return [
    { title: "Kakozane 的博客" },
    { name: "description", content: "记录技术、思考与生活。" },
  ];
}

export default function Home() {
  const [user, setUser] = useState<PublicUser | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    void currentUser().then(setUser).catch(() => setError("暂时无法读取登录状态"));
  }, []);

  async function signOut() {
    try {
      await logout();
      setUser(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "退出失败");
    }
  }

  return (
    <div className="mx-auto min-h-screen max-w-3xl px-6 py-10">
      <header className="flex items-center justify-between border-b border-border pb-6">
        <a className="text-xl font-semibold tracking-tight" href="/">Kakozane</a>
        {user ? (
          <div className="flex items-center gap-4 text-sm">
            <span>{user.displayName}</span>
            <button className="text-muted-foreground hover:text-foreground" onClick={signOut} type="button">退出</button>
          </div>
        ) : (
          <Link className="text-sm text-muted-foreground hover:text-foreground" to="/login">登录</Link>
        )}
      </header>
      <main className="py-20">
        {error && <p className="mb-4 text-sm text-destructive" role="alert">{error}</p>}
        <p className="mb-3 text-sm text-muted-foreground">欢迎来到我的博客</p>
        <h1 className="mb-6 text-4xl font-semibold tracking-tight sm:text-5xl">记录，思考，分享。</h1>
        <p className="max-w-xl leading-8 text-muted-foreground">
          这里会放下技术实践和日常思考。第一篇文章正在准备中。
        </p>
      </main>
    </div>
  );
}
