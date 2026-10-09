import assert from "node:assert/strict";
import test from "node:test";

import { contentLabel, contentListPath, contentPath } from "./content-path.ts";

test("all content kinds use their own public routes", () => {
  assert.equal(contentPath("post", "hello"), "/posts/hello");
  assert.equal(contentPath("note", "day one"), "/notes/day%20one");
  assert.equal(contentPath("thought", "今日"), "/thinking/%E4%BB%8A%E6%97%A5");
  assert.equal(contentListPath("post"), "/posts");
  assert.equal(contentListPath("thought"), "/posts");
  assert.equal(contentListPath("note"), "/posts");
  assert.equal(contentLabel("thought"), "文章");
});
