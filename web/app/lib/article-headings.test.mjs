import assert from "node:assert/strict";
import test from "node:test";

import { articleHeadings } from "./article-headings.ts";

test("article TOC uses source lines and ignores fenced examples", () => {
  const markdown = "## 同名\n\n~~~\n## 假标题\n~~~\n\n### 同名";
  assert.deepEqual(articleHeadings(markdown, 42), [
    { id: "section-42-1", title: "同名", level: 2 },
    { id: "section-42-7", title: "同名", level: 3 },
  ]);
});

test("article TOC ignores headings inside math blocks", () => {
  const markdown = "$$\n## 不是标题\n$$\n\n## 正文标题";
  assert.deepEqual(articleHeadings(markdown, 7), [
    { id: "section-7-5", title: "正文标题", level: 2 },
  ]);
});
