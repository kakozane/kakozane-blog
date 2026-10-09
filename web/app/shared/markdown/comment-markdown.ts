import { createElement } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export function CommentMarkdown({ children }: { children: string }) {
  return createElement("div", { className: "comment-markdown" }, createElement(ReactMarkdown, {
    remarkPlugins: [remarkGfm],
    allowedElements: ["p", "br", "strong", "em", "del", "a", "ul", "ol", "li", "blockquote", "code", "pre", "img"],
    unwrapDisallowed: true,
    components: {
      a: ({ href, children }) => href
        ? createElement("a", { href, rel: "nofollow ugc noopener noreferrer", target: "_blank" }, children)
        : createElement("span", null, children),
      img: ({ alt }) => createElement("span", null, alt ? `[图片：${alt}]` : "[图片]"),
    },
    children,
  }));
}
