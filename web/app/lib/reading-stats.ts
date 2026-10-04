import remarkRehype from "remark-rehype";
import rehypeRaw from "rehype-raw";
import rehypeSanitize from "rehype-sanitize";
import type { Root, Element } from "hast";
import { isRichHTML } from "./rich-html.ts";
import { toString } from "mdast-util-to-string";
import remarkParse from "remark-parse";
import { unified } from "unified";

const markdown = unified().use(remarkParse);

export function markdownText(source: string) {
  if (isRichHTML(source)) {
    const parser = unified().use(remarkParse).use(remarkRehype, { allowDangerousHtml: true }).use(rehypeRaw).use(rehypeSanitize);
    const tree = parser.runSync(parser.parse(source)) as Root;
    function text(node: Root | Element): string { return node.children.map((child) => child.type === "text" ? child.value : child.type === "element" ? text(child) : "").join(" "); }
    return text(tree).replace(/\s+/gu, " ").trim();
  }
  return toString(markdown.parse(source)).replace(/\s+/gu, " ").trim();
}

export function readingStats(source: string) {
  const text = markdownText(source);
  const characters = Array.from(text.replace(/\s/gu, "")).length;
  const han = (text.match(/\p{Script=Han}/gu) ?? []).length;
  const words = (text.match(/[A-Za-z0-9]+(?:['’-][A-Za-z0-9]+)*/gu) ?? []).length;
  return { characters, minutes: Math.max(1, Math.ceil(han / 350 + words / 200)) };
}

export function wasRevised(publishedAt: string | null, updatedAt: string) {
  return publishedAt !== null && new Date(updatedAt).getTime() - new Date(publishedAt).getTime() > 60_000;
}

export function isOutdated(updatedAt: string, now = Date.now()) {
  const modified = Date.parse(updatedAt);
  return Number.isFinite(modified) && now - modified > 180 * 24 * 60 * 60 * 1000;
}
