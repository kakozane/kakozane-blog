import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { markdownOptions } from "./markdown-options.ts";

test("article Markdown renders localized footnotes and task lists", () => {
  const html = renderToStaticMarkup(createElement(ReactMarkdown, {
    remarkPlugins: [remarkGfm], remarkRehypeOptions: markdownOptions,
    children: "结论[^source]。\n\n[^source]: 参考资料。\n\n- [ ] 待办\n- [x] 完成",
  }));
  assert.match(html, /href="#user-content-fn-source"/);
  assert.match(html, /<h2 class="footnote-label" id="footnote-label">脚注<\/h2>/);
  assert.match(html, /aria-label="返回引用"/);
  assert.match(html, /<input type="checkbox" disabled="" checked=""\/> 完成/);
});
