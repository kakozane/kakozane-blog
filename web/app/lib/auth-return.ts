const origin = "https://blog.invalid";

export function safeReturnPath(value: string | null, fallback = "/"): string {
  if (!value?.startsWith("/") || value.startsWith("//")) return fallback;
  try {
    const url = new URL(value, origin);
    if (url.origin !== origin || /^\/(login|register)\/?$/.test(url.pathname)) return fallback;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return fallback;
  }
}

export function authPagePath(page: "login" | "register", next: string): string {
  const url = new URL(safeReturnPath(next), origin);
  url.searchParams.set("auth", page);
  return `${url.pathname}${url.search}${url.hash}`;
}
