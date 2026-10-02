import assert from "node:assert/strict";
import test from "node:test";

import { isOutdated, readingStats, wasRevised } from "./reading-stats.ts";

test("reading stats count rendered text rather than Markdown URLs or markers", () => {
  const stats = readingStats("# 标题\n\n中文 [链接](https://example.com/long/path) ![配图](https://example.com/image.png)");
  assert.deepEqual(stats, { characters: 8, minutes: 1 });
  assert.equal(readingStats("汉".repeat(701)).minutes, 3);
  assert.equal(readingStats("word ".repeat(401)).minutes, 3);
});

test("updated label appears only after publication and a later edit", () => {
  assert.equal(wasRevised(null, "2026-10-02T12:00:00Z"), false);
  assert.equal(wasRevised("2026-10-02T12:00:00Z", "2026-10-02T12:00:30Z"), false);
  assert.equal(wasRevised("2026-10-02T12:00:00Z", "2026-10-02T12:02:00Z"), true);
});

test("old article notice only appears after 180 days without an update", () => {
  const now = Date.parse("2026-10-02T12:00:00Z");
  assert.equal(isOutdated("2026-04-05T12:00:00Z", now), false);
  assert.equal(isOutdated("2026-04-05T11:59:59Z", now), true);
  assert.equal(isOutdated("invalid", now), false);
});
