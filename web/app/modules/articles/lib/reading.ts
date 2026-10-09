export function progressThroughArticle(scrollY: number, top: number, height: number, viewportHeight: number): number {
  const distance = Math.max(height - viewportHeight / 2, 1);
  return Math.min(100, Math.max(0, Math.round((scrollY - top) / distance * 100)));
}

export function scrollYForProgress(progress: number, top: number, height: number, viewportHeight: number): number {
  return top + Math.max(height - viewportHeight / 2, 1) * progress / 100;
}

export function savedReadingProgress(raw: string | null, updatedAt: string): number | null {
  if (!raw) return null;
  try {
    const value: unknown = JSON.parse(raw);
    if (value && typeof value === "object" && "updatedAt" in value && "progress" in value &&
      value.updatedAt === updatedAt && typeof value.progress === "number" && Number.isInteger(value.progress) &&
      value.progress >= 5 && value.progress < 95) return value.progress;
  } catch { /* 忽略已损坏的本地记录。 */ }
  return null;
}

export function savedReadingSize(raw: string | null): 0 | 1 | 2 {
  return raw === "1" ? 1 : raw === "2" ? 2 : 0;
}
