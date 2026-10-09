import type { AuthResponse, LoginInput, PublicUser, RegisterInput } from "../types/auth";

const endpoint = "/api/v1/auth";

export async function login(input: LoginInput): Promise<PublicUser> {
  const response = await fetch(`${endpoint}/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "same-origin",
    body: JSON.stringify(input),
  });
  const data = (await response.json()) as AuthResponse;
  if (!response.ok) throw new Error(data.error ?? "登录失败，请稍后重试");
  return data.user;
}

export async function register(input: RegisterInput): Promise<PublicUser> {
  const response = await fetch(`${endpoint}/register`, {
    method: "POST", headers: { "Content-Type": "application/json" }, credentials: "same-origin",
    body: JSON.stringify(input),
  });
  const data = (await response.json()) as PublicUser & { error?: string };
  if (!response.ok) throw new Error(data.error ?? "注册失败，请稍后重试");
  return data;
}

export async function currentUser(): Promise<PublicUser | null> {
  const response = await fetch(`${endpoint}/me`, { credentials: "same-origin" });
  if (response.status === 401) return null;
  if (!response.ok) throw new Error("无法读取登录状态");
  const data = (await response.json()) as AuthResponse;
  return data.user;
}

export async function logout(): Promise<void> {
  const response = await fetch(`${endpoint}/logout`, {
    method: "POST",
    credentials: "same-origin",
  });
  if (!response.ok) throw new Error("退出失败，请稍后重试");
}

export async function updateProfile(displayName: string): Promise<void> {
  const response = await fetch(`${endpoint}/profile`, {
    method: "PUT", credentials: "same-origin", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ displayName }),
  });
  if (!response.ok) {
    const data = (await response.json()) as AuthResponse;
    throw new Error(data.error ?? "保存失败");
  }
}

export async function changePassword(oldPassword: string, newPassword: string): Promise<void> {
  const response = await fetch(`${endpoint}/change-password`, {
    method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ oldPassword, newPassword }),
  });
  if (!response.ok) {
    const data = (await response.json()) as AuthResponse;
    throw new Error(data.error ?? "修改失败");
  }
}
