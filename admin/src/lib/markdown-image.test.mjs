import assert from 'node:assert/strict'
import test from 'node:test'

import { insertMarkdownImage } from './markdown-image.ts'

test('inserts a standalone image at the cursor without losing neighboring text', () => {
  assert.deepEqual(insertMarkdownImage('beforeafter', 6, 6, '/uploads/a.webp', 'a.webp'), {
    value: 'before\n\n![a](/uploads/a.webp)\n\nafter', cursor: 29,
  })
  assert.equal(insertMarkdownImage('intro\n\nold\n\nend', 7, 10, '/uploads/new.png', 'new.png').value, 'intro\n\n![old](/uploads/new.png)\n\nend')
  assert.equal(insertMarkdownImage('', 0, 0, '/uploads/x.jpg', 'bad]name.jpg').value, '![bad name](/uploads/x.jpg)')
})
