import assert from "node:assert/strict";
import test from "node:test";

import { searchPreview } from "./search-preview.ts";

test("quick search mixes posts and pages by date and links to the right route", () => {
  const posts = [{ id: 1, kind: "note", title: "手记", slug: "我的手记", excerpt: "摘要", publishedAt: "2026-10-01T00:00:00Z", createdAt: "2026-10-01T00:00:00Z" }];
  const pages = [{ id: 2, title: "使用清单", slug: "我的页面", description: "页面摘要", publishedAt: "2026-10-02T00:00:00Z", createdAt: "2026-10-02T00:00:00Z" }];
  const items = searchPreview(posts, pages);
  assert.deepEqual(items.map(({ label, href }) => [label, href]), [["页面", "/pages/%E6%88%91%E7%9A%84%E9%A1%B5%E9%9D%A2"], ["文章", "/notes/%E6%88%91%E7%9A%84%E6%89%8B%E8%AE%B0"]]);
});
