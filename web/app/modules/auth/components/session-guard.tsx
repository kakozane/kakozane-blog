import { useEffect, useState } from "react";
import { Link, useLocation, useRevalidator, useRouteLoaderData } from "react-router";
import { currentUser } from "../api/auth";
import type { PublicUser } from "../types/auth";
import { authPagePath } from "../lib/auth-return";

export function SessionGuard() {
  const root = useRouteLoaderData("root") as { user: PublicUser | null } | undefined;
  const userID = root?.user?.id;
  const { revalidate } = useRevalidator();
  const location = useLocation();
  const [expired, setExpired] = useState(false);
  useEffect(() => {
    if (!userID) return;
    let disposed = false;
    let pending = false;
    async function check() {
      if (disposed || pending || document.hidden) return;
      pending = true;
      try {
        const user = await currentUser();
        if (!disposed && !user) {
          disposed = true;
          setExpired(true);
          void revalidate();
        }
      } catch { /* 临时断网不退出登录。 */ }
      finally { pending = false; }
    }
    void check();
    const timer = window.setInterval(check, 15_000);
    window.addEventListener("focus", check);
    document.addEventListener("visibilitychange", check);
    return () => {
      disposed = true;
      window.clearInterval(timer);
      window.removeEventListener("focus", check);
      document.removeEventListener("visibilitychange", check);
    };
  }, [userID, revalidate]);
  if (!expired) return null;
  const next = location.pathname + location.search + location.hash;
  return <div role="alert" className="fixed bottom-6 left-1/2 z-50 w-[min(90vw,32rem)] -translate-x-1/2 rounded-lg border border-border bg-background p-4 text-sm text-foreground shadow-lg">
    <p>登录已失效，可能已在其他设备登录。请重新登录。</p>
    <div className="mt-2 flex gap-4">
      <Link to={authPagePath("login", next)} preventScrollReset onClick={() => setExpired(false)}>重新登录</Link>
      <button type="button" onClick={() => setExpired(false)}>关闭</button>
    </div>
  </div>;
}
