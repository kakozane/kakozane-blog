import assert from "node:assert/strict";
import test from "node:test";

import { jsonLd, postingData, websiteData } from "./structured-data.ts";

const site = { title: "Kakozane", description: "个人博客", siteUrl: "https://kakozane.icu" };

test("structured data uses canonical URLs, visible author, and publication dates", () => {
  assert.deepEqual(websiteData(site), {
    "@context": "https://schema.org", "@type": "WebSite", name: "Kakozane",
    url: "https://kakozane.icu/", description: "个人博客",
  });
  const post = postingData({
    kind: "note", slug: "day-one", title: "第一天", excerpt: "记录", coverUrl: "/uploads/cover.png",
    publishedAt: "2026-10-01T08:00:00Z", createdAt: "2026-09-30T08:00:00Z",
    updatedAt: "2026-10-02T08:00:00Z", authorName: "作者",
  }, site);
  assert.equal(post.url, "https://kakozane.icu/notes/day-one");
  assert.equal(post.datePublished, "2026-10-01T08:00:00Z");
  assert.equal(post.dateModified, "2026-10-02T08:00:00Z");
  assert.deepEqual(post.author, { "@type": "Person", name: "作者" });
  assert.equal(post.image, "https://kakozane.icu/uploads/cover.png");
});

test("JSON-LD cannot close its script tag from user content", () => {
  const value = { headline: '</script><script>alert("x")</script>' };
  const encoded = jsonLd(value);
  assert.equal(encoded.includes("<"), false);
  assert.deepEqual(JSON.parse(encoded), value);
});
