import assert from "node:assert/strict";
import test from "node:test";

import { mermaidSVGWidth } from "./mermaid-svg.ts";

test("Mermaid SVG keeps its diagram width instead of stretching to the article width", () => {
  assert.equal(mermaidSVGWidth('<svg width="100%" viewBox="4 4 196 164"></svg>'), 196);
  assert.equal(mermaidSVGWidth('<svg></svg>'), undefined);
});
