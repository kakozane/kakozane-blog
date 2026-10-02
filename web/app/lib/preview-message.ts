export type PreviewPost = {
  kind: "post" | "note" | "page";
  title: string;
  excerpt: string;
  contentMd: string;
  coverUrl: string;
};

export function adminPreviewOrigin(current: string): string {
  const url = new URL(current);
  if (url.hostname === "localhost" && url.port === "6325") url.port = "6326";
  else url.hostname = `admin.${url.hostname}`;
  return url.origin;
}

export function parsePreviewMessage(value: unknown): PreviewPost | null {
  if (!value || typeof value !== "object" || !("type" in value) || value.type !== "kakozane-preview" || !("post" in value)) return null;
  const post = value.post;
  if (!post || typeof post !== "object") return null;
  if (!("kind" in post) || (post.kind !== "post" && post.kind !== "note" && post.kind !== "page")) return null;
  if (!("title" in post) || typeof post.title !== "string" || post.title.length > 240) return null;
  if (!("excerpt" in post) || typeof post.excerpt !== "string" || post.excerpt.length > 500) return null;
  if (!("contentMd" in post) || typeof post.contentMd !== "string" || post.contentMd.length > (2 << 20)) return null;
  if (!("coverUrl" in post) || typeof post.coverUrl !== "string" || post.coverUrl.length > 1024 ||
    (post.coverUrl !== "" && !/^https:\/\/\S+$/.test(post.coverUrl) && !/^\/(?!\/)\S+$/.test(post.coverUrl))) return null;
  return { kind: post.kind, title: post.title, excerpt: post.excerpt, contentMd: post.contentMd, coverUrl: post.coverUrl };
}
