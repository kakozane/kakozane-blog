import assert from "node:assert/strict";
import test from "node:test";

import { addSelectionQuote } from "./selection-quote.ts";

test("selection becomes a bounded Markdown quote without losing the draft", () => {
  assert.equal(addSelectionQuote("先写的想法", "  一段\n 文字  "), "先写的想法\n\n> 一段 文字\n\n");
  assert.equal(addSelectionQuote("", "  "), null);
  assert.equal(addSelectionQuote("", "😀".repeat(241)), `> ${"😀".repeat(240)}…\n\n`);
  assert.equal(addSelectionQuote("x".repeat(1995), "引用"), null);
});
