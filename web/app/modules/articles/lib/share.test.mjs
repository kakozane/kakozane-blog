import assert from "node:assert/strict";
import test from "node:test";

import { shareArticle } from "./share.ts";

test("share uses the native sheet, respects cancellation, and falls back to copying", async () => {
  const title = "一篇文章";
  const url = "https://kakozane.icu/posts/hello";
  const calls = [];
  const clipboard = { writeText: async (value) => { calls.push(["copy", value]); } };

  assert.equal(await shareArticle(title, url, {
    share: async (data) => { calls.push(["share", data.title, data.url]); }, clipboard,
  }), "shared");
  assert.deepEqual(calls, [["share", title, url]]);

  assert.equal(await shareArticle(title, url, {
    share: async () => { throw new DOMException("cancelled", "AbortError"); }, clipboard,
  }), "cancelled");
  assert.equal(calls.length, 1);

  assert.equal(await shareArticle(title, url, {
    share: async () => { throw new Error("unavailable"); }, clipboard,
  }), "copied");
  assert.deepEqual(calls.at(-1), ["copy", url]);
});
