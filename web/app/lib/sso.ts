import type { SSOCandidate } from "../types/sso";

const endpoint = "/api/v1/auth/sso";
const sourcePath = "/api/v1/admin/auth/sso";

export async function ssoCandidate(signal: AbortSignal): Promise<SSOCandidate | null> {
  const config = await fetch(`${endpoint}/config`, { signal, cache: "no-store" });
  if (!config.ok) return null;
  const { sourceOrigin } = await config.json() as { sourceOrigin: string };
  if (!sourceOrigin) return null;
  const response = await fetch(`${sourceOrigin}${sourcePath}/status`, { credentials: "include", signal, cache: "no-store" });
  if (!response.ok) return null;
  const data = await response.json() as Omit<SSOCandidate, "sourceOrigin">;
  return data.user ? { ...data, sourceOrigin } : null;
}

export async function ssoLogin(candidate: SSOCandidate): Promise<void> {
  // 凭证只在内存中传递，不放入 URL 或 localStorage。
  const issued = await fetch(`${candidate.sourceOrigin}${sourcePath}/ticket`, {
    method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId: candidate.user.id }),
  });
  const data = await issued.json() as { ticket?: string; error?: string };
  if (!issued.ok || !data.ticket) throw new Error(data.error ?? "无法确认另一端的登录状态");
  const response = await fetch(`${endpoint}/exchange`, {
    method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ticket: data.ticket }),
  });
  if (!response.ok) {
    const result = await response.json() as { error?: string };
    throw new Error(result.error ?? "单点登录失败，请重试");
  }
}
