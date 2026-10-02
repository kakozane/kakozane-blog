import assert from 'node:assert/strict'
import test from 'node:test'

import { publicPreviewOrigin } from './preview-origin.ts'

test('preview uses the matching public origin', () => {
  assert.equal(publicPreviewOrigin('https://localhost:6326/posts/new'), 'https://localhost:6325')
  assert.equal(publicPreviewOrigin('https://admin.kakozane.icu/posts/new'), 'https://kakozane.icu')
  assert.throws(() => publicPreviewOrigin('https://other.example/posts/new'))
})
