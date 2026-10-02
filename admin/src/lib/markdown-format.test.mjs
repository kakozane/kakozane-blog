import assert from 'node:assert/strict'
import test from 'node:test'
import { formatMarkdown } from './markdown-format.ts'

test('formatting keeps surrounding text and selects editable content', () => {
  const bold = formatMarkdown('前文选中文后文', 2, 5, 'bold')
  assert.equal(bold.value, '前文**选中文**后文')
  assert.equal(bold.value.slice(bold.selectionStart, bold.selectionEnd), '选中文')
  assert.equal(formatMarkdown('一行\n二行\n末行', 0, 5, 'bullet').value, '- 一行\n- 二行\n\n末行')
  assert.equal(formatMarkdown('', 0, 0, 'link').value, '[链接文字](https://example.com)')
  assert.equal(formatMarkdown('前后', 1, 1, 'code').value, '前\n\n```text\n代码\n```\n\n后')
})
