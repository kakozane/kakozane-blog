import type { PublicUser } from "../types/auth";

const api = process.env.API_INTERNAL_URL ?? "http://localhost:6324";

export async function frontUser(request: Request): Promise<PublicUser | null> {
  try {
    const response = await fetch(`${api}/api/v1/auth/me`, { headers: { Cookie: request.headers.get("Cookie") ?? "" } });
    if (!response.ok) return null;
    const data = (await response.json()) as { user: PublicUser };
    return data.user;
  } catch {
    return null;
  }
}
