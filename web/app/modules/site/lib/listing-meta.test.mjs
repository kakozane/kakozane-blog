import assert from "node:assert/strict";
import test from "node:test";

import { listingMeta } from "./listing-meta.ts";

const site = { title: "Kakozane", siteUrl: "https://kakozane.icu", avatarUrl: "/avatar.png" };

test("listing metadata gives each page its own canonical and share URL", () => {
  const first = listingMeta(site, "手记专栏", "简介", "/notes/series/life", 1);
  const second = listingMeta(site, "手记专栏", "简介", "/notes/series/life", 2);
  assert.equal(first.find((item) => item.rel === "canonical")?.href, "https://kakozane.icu/notes/series/life");
  assert.equal(second.find((item) => item.rel === "canonical")?.href, "https://kakozane.icu/notes/series/life?page=2");
  assert.equal(second.find((item) => item.property === "og:url")?.content, "https://kakozane.icu/notes/series/life?page=2");
  assert.equal(second.find((item) => item.property === "og:image")?.content, "https://kakozane.icu/avatar.png");
});
