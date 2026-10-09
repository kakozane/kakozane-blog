import assert from 'node:assert/strict';
import test from 'node:test';
import { getPosts } from './posts.server.ts';

test('unified article listing requests all kinds and keeps filtering, sorting and homepage pins', async (t) => {
  const urls = [];
  const items = ['post', 'note', 'thought'].map((kind, id) => ({ id, kind, slug: kind }));
  t.mock.method(globalThis, 'fetch', async (url) => {
    urls.push(new URL(url));
    return Response.json({ items, total: 3, page: 2, pageSize: 12 });
  });
  const params = new URLSearchParams({ page: '2', pageSize: '12', q: '博客', category: 'life', tag: 'go', sort: 'oldest', kind: 'post' });
  const result = await getPosts(params);
  assert.deepEqual(result.items, items);
  assert.equal(urls[0].pathname, '/api/v1/timeline');
  assert.equal(urls[0].searchParams.has('kind'), false);
  for (const key of ['page', 'pageSize', 'q', 'category', 'tag', 'sort']) assert.equal(urls[0].searchParams.get(key), params.get(key));
  await getPosts(params, true);
  assert.equal(urls[1].searchParams.get('pinFirst'), '1');
  assert.equal(urls[1].searchParams.has('sort'), false);
});
