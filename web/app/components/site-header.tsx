import { useState } from "react";
import { Link, NavLink, useRouteLoaderData } from "react-router";

import { logout } from "../lib/auth";
import type { PublicUser } from "../types/auth";
import type { Site } from "../types/site";

export function SiteHeader() {
  const { user, site } = useRouteLoaderData("root") as { user: PublicUser | null; site: Site };
  const [error, setError] = useState("");

  async function signOut() {
    try {
      await logout();
      window.location.assign("/");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "退出失败");
    }
  }

  return (
    <>
    <header className="site-header">
      <Link className="site-logo" to="/">{site.title}<span className="site-logo-dot">.</span></Link>
      <nav aria-label="主导航" className="site-nav">
        <NavLink to="/" end>首页</NavLink>
        <NavLink to="/archive">归档</NavLink>
        <NavLink to="/about">关于</NavLink>
        {user && <NavLink to="/account">我的账号</NavLink>}
      </nav>
      {user ? <button className="site-login" onClick={signOut} type="button">退出</button> : <Link className="site-login" to="/login">登录</Link>}
    </header>
    {error && <p className="site-error" role="alert">{error}</p>}
    </>
  );
}
