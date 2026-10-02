import assert from "node:assert/strict";
import test from "node:test";

import { adminPreviewOrigin, parsePreviewMessage } from "./preview-message.ts";

test("preview accepts bounded content from the matching admin origin", () => {
  assert.equal(adminPreviewOrigin("https://localhost:6325/preview"), "https://localhost:6326");
  assert.equal(adminPreviewOrigin("https://kakozane.icu/preview"), "https://admin.kakozane.icu");
  const post = { kind: "post", title: "预览", excerpt: "", contentMd: "# 正文", coverUrl: "" };
  assert.deepEqual(parsePreviewMessage({ type: "kakozane-preview", post }), post);
  assert.deepEqual(parsePreviewMessage({ type: "kakozane-preview", post: { ...post, kind: "page" } }), { ...post, kind: "page" });
  assert.equal(parsePreviewMessage({ type: "kakozane-preview", post: { ...post, coverUrl: "javascript:alert(1)" } }), null);
  assert.equal(parsePreviewMessage({ type: "wrong", post }), null);
  assert.equal(parsePreviewMessage({ type: "kakozane-preview", post: { ...post, contentMd: "x".repeat((2 << 20) + 1) } }), null);
});
