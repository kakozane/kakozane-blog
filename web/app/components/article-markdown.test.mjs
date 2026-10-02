import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createServer } from "vite";

test("published Markdown renders headings, images and code the same way as preview", async () => {
  const vite = await createServer({ server: { middlewareMode: true }, appType: "custom" });
  try {
    const { ArticleMarkdown } = await vite.ssrLoadModule("/app/components/article-markdown.tsx");
    const { ArticleToc } = await vite.ssrLoadModule("/app/components/article-toc.tsx");
    const { articleHeadings } = await vite.ssrLoadModule("/app/lib/article-headings.ts");
    const source = "## 章节\n\n![配图](/uploads/demo.png)\n\n[![外链图](/uploads/linked.png)](https://example.com)\n\n```js\nconsole.log(1)\n```";
    const html = renderToStaticMarkup(createElement(ArticleMarkdown, {
      articleID: 42,
      source,
    }));
    const toc = renderToStaticMarkup(createElement(ArticleToc, { headings: articleHeadings(source, 42), label: "页面" }));
    assert.match(html, /id="section-42-1"/);
    assert.match(toc, /href="#section-42-1"/);
    assert.match(html, /查看大图：配图/);
    assert.match(html, /<figcaption>配图<\/figcaption>/);
    assert.match(html, /<a href="https:\/\/example.com"><img[^>]*linked.png/);
    assert.equal((html.match(/查看大图/g) ?? []).length, 1);
    assert.match(html, /复制代码/);
  } finally {
    await vite.close();
  }
});
