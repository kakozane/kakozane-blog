import test from 'node:test'
import assert from 'node:assert/strict'
import { importMarkdown, exportMarkdown } from './markdown-file.ts'
test('Markdown roundtrip preserves rich formats and rejects oversized files', () => {
 for (const text of ['# 标题\n\n正文', '<!-- tiptap-rich-html -->\n<p><u>正文</u></p>']) assert.equal(importMarkdown(exportMarkdown(text)),text)
 assert.equal(importMarkdown('\uFEFF# 标题'),'# 标题')
 assert.throws(()=>importMarkdown('a'.repeat(1024*1024+1)))
})
