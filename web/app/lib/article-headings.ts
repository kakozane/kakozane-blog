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
  return parser.parse(markdown).children.flatMap((node) => {
    if (node.type !== "heading" || (node.depth !== 2 && node.depth !== 3) || !node.position) return [];
    return [{ id: headingID(articleID, node.position.start.line), title: toString(node).trim(), level: node.depth }];
  });
}
