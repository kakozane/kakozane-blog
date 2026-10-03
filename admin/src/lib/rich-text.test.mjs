import assert from 'node:assert/strict'
import test from 'node:test'
import { MarkdownManager } from '@tiptap/markdown'
import { richTextExtensions, needsSource, restoreAlerts } from './rich-text.ts'

test('Tiptap preserves blog Markdown semantics and protects unsupported content', () => {
  const manager = new MarkdownManager({ extensions: richTextExtensions })
  const input = '## 标题\n\n**加粗**和*斜体*\n\n> [!NOTE]\n> 提示内容\n\n- [x] 已完成\n\n| A | B |\n| --- | --- |\n| 1 | 2 |\n\n![图片](/uploads/example.png)\n\n```mermaid\nflowchart LR\n A-->B\n```\n\n$$\nE = mc^2\n$$'
  const json = manager.parse(input)
  const output = restoreAlerts(manager.serialize(json))
  assert.deepEqual(manager.parse(output), json)
  for (const text of ['[!NOTE]', '- [x]', '/uploads/example.png', '```mermaid', 'E = mc^2']) assert(output.includes(text), output)
  assert(needsSource('引用[^1]\n\n[^1]: 脚注'))
  assert(needsSource('<details>内容</details>'))
  assert(!needsSource(input))
})
