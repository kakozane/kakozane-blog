import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { CommentMarkdown } from "./comment-markdown.ts";

test("comments render useful Markdown without executable HTML or remote images", () => {
  const html = renderToStaticMarkup(createElement(CommentMarkdown, {
    children: "**加粗** [链接](https://example.com) [恶意](javascript:alert(1)) ![配图](https://example.com/track.png)\n\n> 引用\n\n<script>alert(1)</script>",
  }));
  assert.match(html, /<strong>加粗<\/strong>/);
  assert.match(html, /<a href="https:\/\/example\.com" rel="nofollow ugc noopener noreferrer" target="_blank">链接<\/a>/);
  assert.match(html, /\[图片：配图\]/);
  assert.match(html, /<blockquote>/);
  assert.doesNotMatch(html, /<script|<img|javascript:/);
});
