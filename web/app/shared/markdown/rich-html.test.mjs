import assert from 'node:assert/strict'
import test from 'node:test'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import ReactMarkdown from 'react-markdown'
import rehypeRaw from 'rehype-raw'
import rehypeSanitize from 'rehype-sanitize'
import { richHTMLFormatting, richHTMLSchema, RICH_HTML_PREFIX } from './rich-html.ts'
import { markdownText } from '../../modules/articles/lib/reading-stats.ts'
import { articleHeadings } from './article-headings.ts'

test('official editor formatting is rendered with a restricted HTML allowlist', () => {
 const source=RICH_HTML_PREFIX+'\n<h2>第一章</h2>\n<p style="text-align: center; position:fixed"><u>下划线</u><sup>2</sup><mark data-color="var(--tt-color-highlight-yellow)">高亮</mark></p><script>alert(1)</script><img src="javascript:alert(1)" onerror="alert(1)">\n<h3>第二章</h3>'
 const html=renderToStaticMarkup(createElement(ReactMarkdown,{rehypePlugins:[rehypeRaw,richHTMLFormatting,[rehypeSanitize,richHTMLSchema]]},source))
 assert.match(markdownText(source), /第一章/); assert(!markdownText(source).includes('alert(1)'))
 assert.match(html,/class="rich-align-center"/)
 assert.match(html,/<u>下划线<\/u>/)
 assert.match(html,/class="rich-highlight-yellow"/)
 assert(!/script|onerror|javascript:|position:fixed/.test(html),html)
 assert.deepEqual(articleHeadings(source,3).map(h=>h.title),['第一章','第二章'])
 assert.notEqual(articleHeadings(source,3)[0].id,articleHeadings(source,3)[1].id)
})

test('rich HTML preserves all alert variants, including formatted markers', () => {
 for (const kind of ['NOTE', 'TIP', 'IMPORTANT', 'WARNING', 'CAUTION']) {
  for (const marker of [`[!${kind}]\n正文`, `<u>[!${kind}]\n正文</u>`, `[!${kind}]<br>正文`]) {
   const source=RICH_HTML_PREFIX+`<blockquote><p>${marker}</p></blockquote>`
   const html=renderToStaticMarkup(createElement(ReactMarkdown,{rehypePlugins:[rehypeRaw,richHTMLFormatting,[rehypeSanitize,richHTMLSchema]]},source))
   assert(html.includes(`markdown-alert-${kind.toLowerCase()}`),html)
   assert(html.includes('markdown-alert-title'),html)
   assert(html.includes('正文'),html)
   assert(!html.includes(`[!${kind}]`),html)
  }
 }
})
