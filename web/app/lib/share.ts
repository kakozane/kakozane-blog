type ShareTarget = {
  share?: (data: ShareData) => Promise<void>;
  clipboard?: Pick<Clipboard, "writeText">;
};

export async function shareArticle(title: string, url: string, target: ShareTarget): Promise<"shared" | "copied" | "cancelled"> {
  if (target.share) {
    try {
      await target.share({ title, url });
      return "shared";
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") return "cancelled";
    }
  }
  if (!target.clipboard) throw new Error("浏览器不支持复制链接");
  await target.clipboard.writeText(url);
  return "copied";
}
