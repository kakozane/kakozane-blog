import assert from "node:assert/strict";
import test from "node:test";

import { sectionMeta } from "./section-meta.ts";

const site = { title: "Kakozane", description: "个人博客", siteUrl: "https://kakozane.icu" };

test("section metadata keeps pagination distinct and excludes filtered views", () => {
  assert.equal(sectionMeta(site, "/notes", "?page=2")?.canonical, "https://kakozane.icu/notes?page=2");
  assert.equal(sectionMeta(site, "/notes", "?page=2")?.ogURL, "https://kakozane.icu/notes?page=2");
  assert.equal(sectionMeta(site, "/notes", "?featured=1&page=2")?.canonical, null);
  assert.equal(sectionMeta(site, "/notes", "?featured=1&page=2")?.noindex, true);
  assert.equal(sectionMeta(site, "/timeline", "?kind=post")?.noindex, true);
  assert.equal(sectionMeta(site, "/posts", "?page=2")?.canonical, null);
  assert.equal(sectionMeta(site, "/about", "?utm_source=share")?.canonical, "https://kakozane.icu/about");
  assert.equal(sectionMeta(site, "/notes", "?page=invalid")?.canonical, "https://kakozane.icu/notes");
  assert.equal(sectionMeta(site, "/login", ""), null);
});
