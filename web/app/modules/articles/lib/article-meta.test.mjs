import assert from "node:assert/strict";
import test from "node:test";

import { articleMeta } from "./article-meta.ts";

const site = { title: "Kakozane", siteUrl: "https://kakozane.icu", avatarUrl: "/uploads/avatar.png" };

test("article metadata uses canonical URLs and absolute social images for both kinds", () => {
  const post = articleMeta({ kind: "post", slug: "hello-world", title: "Hello", excerpt: "摘要", coverUrl: "/uploads/cover.png" }, site);
  assert.deepEqual(post.find((item) => item.rel === "canonical"), { tagName: "link", rel: "canonical", href: "https://kakozane.icu/posts/hello-world" });
  assert.deepEqual(post.find((item) => item.property === "og:image"), { property: "og:image", content: "https://kakozane.icu/uploads/cover.png" });
  assert.deepEqual(post.find((item) => item.name === "twitter:card"), { name: "twitter:card", content: "summary_large_image" });

  const note = articleMeta({ kind: "note", slug: "day-one", title: "第一天", excerpt: "", coverUrl: "" }, site);
  assert.deepEqual(note.find((item) => item.property === "og:url"), { property: "og:url", content: "https://kakozane.icu/notes/day-one" });
  assert.deepEqual(note.find((item) => item.property === "og:image"), { property: "og:image", content: "https://kakozane.icu/uploads/avatar.png" });
  assert.deepEqual(note.find((item) => item.name === "description"), { name: "description", content: "第一天" });

  const thought = articleMeta({ kind: "thought", slug: "idea", title: "一个想法", excerpt: "记录", coverUrl: "" }, site);
  assert.deepEqual(thought.find((item) => item.rel === "canonical"), { tagName: "link", rel: "canonical", href: "https://kakozane.icu/thinking/idea" });
});
