import rehypeRaw from "rehype-raw";
import remarkRehype from "remark-rehype";
import type { Root, Element } from "hast";
import { isRichHTML } from "./rich-html.ts";
import { toString } from "mdast-util-to-string";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import remarkParse from "remark-parse";
import { unified } from "unified";

export type ArticleHeading = { id: string; title: string; level: 2 | 3 };

export function headingID(articleID: number, line: number): string {
  return `section-${articleID}-${line}`;
}

const parser = unified().use(remarkParse).use(remarkGfm).use(remarkMath);

export function articleHeadings(markdown: string, articleID: number): ArticleHeading[] {
  if (isRichHTML(markdown)) {
    const htmlParser = unified().use(remarkParse).use(remarkRehype, { allowDangerousHtml: true }).use(rehypeRaw);
    const tree = htmlParser.runSync(htmlParser.parse(markdown)) as Root;
    const headings: ArticleHeading[] = [];
    function text(node: Element | Root): string { return node.children.map((child) => child.type === "text" ? child.value : child.type === "element" ? text(child) : "").join(""); }
    function visit(node: Element | Root) {
      if (node.type === "element" && (node.tagName === "h2" || node.tagName === "h3") && node.position) headings.push({ id: headingID(articleID, node.position.start.line), title: text(node).trim(), level: node.tagName === "h2" ? 2 : 3 });
      for (const child of node.children) if (child.type === "element") visit(child);
    }
    visit(tree);
    return headings;
  }
  return parser.parse(markdown).children.flatMap((node) => {
    if (node.type !== "heading" || (node.depth !== 2 && node.depth !== 3) || !node.position) return [];
    return [{ id: headingID(articleID, node.position.start.line), title: toString(node).trim(), level: node.depth }];
  });
}
