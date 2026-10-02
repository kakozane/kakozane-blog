import assert from "node:assert/strict";
import test from "node:test";

import { isSearchShortcut } from "./search-shortcut.ts";

test("search shortcut accepts command or control K without interrupting composition", () => {
  const event = { key: "k", metaKey: false, ctrlKey: false, altKey: false, shiftKey: false, isComposing: false, repeat: false, defaultPrevented: false };
  assert.equal(isSearchShortcut({ ...event, metaKey: true }), true);
  assert.equal(isSearchShortcut({ ...event, ctrlKey: true }), true);
  assert.equal(isSearchShortcut(event), false);
  assert.equal(isSearchShortcut({ ...event, metaKey: true, isComposing: true }), false);
  assert.equal(isSearchShortcut({ ...event, metaKey: true, shiftKey: true }), false);
  assert.equal(isSearchShortcut({ ...event, metaKey: true, defaultPrevented: true }), false);
});
