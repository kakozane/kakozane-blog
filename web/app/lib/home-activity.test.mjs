import assert from "node:assert/strict";
import test from "node:test";

import { commentActivityHref, commentActivityPreview, homeActivity } from "./home-activity.ts";

test("home activity mixes publications, comments, and likes by event time", () => {
  const posts = [
    { id: 1, kind: "post", slug: "older", publishedAt: "2026-10-01T10:00:00Z", createdAt: "2026-09-01T00:00:00Z" },
    { id: 2, kind: "note", slug: "newer", publishedAt: "2026-10-03T10:00:00Z", createdAt: "2026-09-01T00:00:00Z" },
  ];
  const comments = [{ id: 9, kind: "post", slug: "older", createdAt: "2026-10-02T10:00:00Z", body: "**真好** [链接](https://example.com)" }];
  const likes = [{ kind: "note", slug: "newer", title: "新手记", createdAt: "2026-10-02T12:00:00Z" }];
  assert.deepEqual(homeActivity(posts, comments, likes).map((item) => `${item.type}-${item.id}`), ["publication-2", "like-0", "comment-9", "publication-1"]);
  assert.equal(commentActivityHref(comments[0]), "/posts/older?comment=9#comment-9");
  assert.equal(commentActivityPreview(comments[0].body), "真好 链接");
});
