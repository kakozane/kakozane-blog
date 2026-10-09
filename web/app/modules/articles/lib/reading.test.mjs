import assert from "node:assert/strict";
import test from "node:test";

import { progressThroughArticle, savedReadingProgress, savedReadingSize, scrollYForProgress } from "./reading.ts";

test("reading progress stays within 0–100 and reaches the end", () => {
  assert.equal(progressThroughArticle(50, 100, 1000, 600), 0);
  assert.equal(progressThroughArticle(450, 100, 1000, 600), 50);
  assert.equal(progressThroughArticle(900, 100, 1000, 600), 100);
  assert.equal(progressThroughArticle(500, 100, 1000, 600), 57);
  assert.equal(scrollYForProgress(50, 100, 1000, 600), 450);
});

test("saved reading progress rejects old, completed and malformed entries", () => {
  const version = "2026-10-02T00:00:00Z";
  assert.equal(savedReadingProgress(JSON.stringify({ updatedAt: version, progress: 45 }), version), 45);
  assert.equal(savedReadingProgress(JSON.stringify({ updatedAt: "old", progress: 45 }), version), null);
  assert.equal(savedReadingProgress(JSON.stringify({ updatedAt: version, progress: 100 }), version), null);
  assert.equal(savedReadingProgress("not json", version), null);
});

test("reading size accepts only supported local preferences", () => {
  assert.equal(savedReadingSize("1"), 1);
  assert.equal(savedReadingSize("2"), 2);
  assert.equal(savedReadingSize("99"), 0);
  assert.equal(savedReadingSize(null), 0);
});
