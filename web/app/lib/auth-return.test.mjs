import assert from "node:assert/strict";
import test from "node:test";

import { authPagePath, safeReturnPath } from "./auth-return.ts";

test("return paths stay on this site and preserve article comments", () => {
  assert.equal(safeReturnPath("/posts/hello?commentsPage=2#comments-title"), "/posts/hello?commentsPage=2#comments-title");
  assert.equal(authPagePath("login", "/posts/hello#comments-title"), "/login?next=%2Fposts%2Fhello%23comments-title");
  for (const value of ["https://evil.example/", "//evil.example/", "/\\evil.example/", "javascript:alert(1)", "/login?next=/posts/hello", "/register"]) {
    assert.equal(safeReturnPath(value), "/", value);
  }
  assert.equal(safeReturnPath(null, "/account"), "/account");
});
