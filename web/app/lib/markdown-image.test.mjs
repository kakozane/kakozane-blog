import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ReactMarkdown from "react-markdown";

import { standaloneMarkdownImage } from "./markdown-image.ts";

test("only standalone Markdown images become zoom controls", () => {
  const html = renderToStaticMarkup(createElement(ReactMarkdown, {
    components: {
      p: ({ children }) => {
        const image = standaloneMarkdownImage(children);
        return image ? createElement("button", { type: "button", "aria-label": `查看大图：${image.alt}` }, image.element) : createElement("p", null, children);
      },
    },
    children: "![单图](/uploads/one.png)\n\n[![带链接](/uploads/two.png)](https://example.com)\n\n普通文字",
  }));
  assert.match(html, /<button[^>]*查看大图：单图[^>]*><img[^>]*one\.png/);
  assert.match(html, /<p><a href="https:\/\/example\.com"><img[^>]*two\.png/);
  assert.match(html, /<p>普通文字<\/p>/);
  assert.equal((html.match(/<button/g) ?? []).length, 1);
});
