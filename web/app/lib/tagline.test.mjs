import assert from "node:assert/strict";
import test from "node:test";

import { taglinePhrases } from "./tagline.ts";

test("homepage tagline keeps Chinese phrases together at narrow widths", () => {
  assert.deepEqual(taglinePhrases("记录，思考，分享。"), ["记录，", "思考，", "分享。"]);
});
