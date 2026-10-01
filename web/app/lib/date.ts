const zone = "Asia/Shanghai";

export function formatDate(value: string, long = false): string {
  return new Date(value).toLocaleDateString("zh-CN", long
    ? { timeZone: zone, year: "numeric", month: "long", day: "numeric" }
    : { timeZone: zone });
}

export function formatDateTime(value: string): string {
  return new Date(value).toLocaleString("zh-CN", { timeZone: zone });
}
