import assert from 'node:assert/strict'
import test from 'node:test'

import { readLocalDraft, removeLocalDraft, writeLocalDraft } from './local-draft.ts'

test('local draft roundtrip is keyed and corrupt data is ignored', () => {
  const records = new Map()
  globalThis.localStorage = {
    getItem: (key) => records.get(key) ?? null,
    setItem: (key, value) => records.set(key, value),
    removeItem: (key) => records.delete(key),
  }
  assert.equal(writeLocalDraft('user-1:post-2', { title: '未保存' }, 'server-v1'), true)
  assert.equal(readLocalDraft('user-1:post-2').value.title, '未保存')
  assert.equal(readLocalDraft('user-2:post-2'), null)
  records.set('broken', '{')
  assert.equal(readLocalDraft('broken'), null)
  assert.equal(removeLocalDraft('user-1:post-2'), true)
  assert.equal(readLocalDraft('user-1:post-2'), null)
  delete globalThis.localStorage
})
