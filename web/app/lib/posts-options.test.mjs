import assert from "node:assert/strict";
import test from "node:test";

import { postSort, postView, postsHref } from "./posts-options.ts";

test("post view links preserve search and pagination without changing the canonical default", () => {
  assert.equal(postView("compact"), "compact");
  assert.equal(postView("anything"), "preview");
  assert.equal(postSort("updated"), "updated");
  assert.equal(postSort("anything"), "newest");
  assert.equal(postsHref(1, "", "preview", "newest"), "/posts");
  assert.equal(postsHref(2, "Go & React", "compact", "updated"), "/posts?page=2&q=Go+%26+React&view=compact&sort=updated");
  assert.equal(postsHref(1, "Go", "compact", "oldest"), "/posts?q=Go&view=compact&sort=oldest");
});
