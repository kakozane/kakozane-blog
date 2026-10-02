import { useEffect, useState } from "react";

import { ssoCandidate, ssoLogin } from "../lib/sso";
import type { SSOCandidate } from "../types/sso";

export function SSOPrompt({ returnTo }: { returnTo?: string }) {
  const [candidate, setCandidate] = useState<SSOCandidate | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let controller: AbortController;
    function refresh() {
      controller?.abort();
      controller = new AbortController();
      const signal = controller.signal;
      void ssoCandidate(signal).then((value) => { if (!signal.aborted) setCandidate(value); })
        .catch(() => { if (!signal.aborted) setCandidate(null); });
    }
    refresh();
    window.addEventListener("focus", refresh);
    return () => { controller.abort(); window.removeEventListener("focus", refresh); };
  }, []);

  async function confirm() {
    if (!candidate) return;
    setPending(true);
    setError("");
    try {
      await ssoLogin(candidate);
      window.location.assign(returnTo ?? `${window.location.pathname}${window.location.search}${window.location.hash}`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "单点登录失败");
      setPending(false);
    }
  }

  if (!candidate || dismissed) return null;
  return <aside className="sso-prompt" aria-label="使用已有登录身份">
    <p>您已登录后台（{candidate.user.displayName}），是否使用此账号登录前台？</p>
    <div><button disabled={pending} onClick={() => void confirm()} type="button">{pending ? "登录中…" : "使用此账号登录"}</button><button disabled={pending} onClick={() => setDismissed(true)} type="button">暂不登录</button></div>
    {error && <p className="auth-error" role="alert">{error}</p>}
  </aside>;
}
