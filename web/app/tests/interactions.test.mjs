import assert from 'node:assert/strict';
import test from 'node:test';
import { saveComment, myComments, commentLocation } from '../modules/comments/api/comments.ts';
import { currentLikes, setLiked } from '../modules/likes/api/likes.ts';
import { searchContent } from '../modules/search/api/search.ts';

test('comments preserve legacy paths, cookies, create/edit payloads and API errors', async (t) => {
  const calls = [];
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    calls.push({ url, options });
    return Response.json({ id: 4, items: [], page: 2 });
  });
  await saveComment('note', 'a b', { body: 'reply', parentId: 3 });
  assert.equal(calls[0].url, '/api/v1/notes/a%20b/comments');
  assert.equal(calls[0].options.credentials, 'same-origin');
  assert.equal(calls[0].options.method, 'POST');
  assert.deepEqual(JSON.parse(calls[0].options.body), { body: 'reply', parentId: 3 });
  await saveComment('thought', 'old', { body: 'edited' }, 4);
  assert.equal(calls[1].url, '/api/v1/thinking/old/comments/4');
  assert.equal(calls[1].options.method, 'PUT');
  assert.deepEqual(JSON.parse(calls[1].options.body), { body: 'edited' });
  await myComments('post', 'article');
  assert.equal(calls[2].url, '/api/v1/posts/article/comments/mine');
  assert.equal(calls[2].options.credentials, 'same-origin');
  assert.equal((await commentLocation('note', 'old', 4)).page, 2);
  t.mock.method(globalThis, 'fetch', async () => Response.json({ error: '评论已关闭' }, { status: 403 }));
  await assert.rejects(saveComment('post', 'article', { body: 'test' }), /评论已关闭/);
});

test('likes retain PUT/DELETE behavior and expired-session handling', async (t) => {
  const methods = [];
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    assert.equal(url, '/api/v1/thinking/old/likes');
    assert.equal(options.credentials, 'same-origin');
    methods.push(options.method);
    return Response.json({ count: 1, liked: options.method === 'PUT' });
  });
  assert.equal((await setLiked('thought', 'old', true)).liked, true);
  assert.equal((await setLiked('thought', 'old', false)).liked, false);
  assert.deepEqual(methods, ['PUT', 'DELETE']);
  t.mock.method(globalThis, 'fetch', async () => new Response(null, { status: 401 }));
  assert.equal(await currentLikes('post', 'article'), null);
  await assert.rejects(setLiked('post', 'article', true), /请重新登录/);
});

test('search preserves encoded query and cancellation signal for both endpoints', async (t) => {
  const controller = new AbortController();
  const calls = [];
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    const parsed = new URL(url, 'https://example.test');
    calls.push(parsed.pathname);
    assert.equal(parsed.searchParams.get('q'), 'a & 中文');
    assert.equal(options.signal, controller.signal);
    return Response.json({ items: [], total: 0 });
  });
  const result = await searchContent('a & 中文', controller.signal);
  assert.deepEqual(calls, ['/api/v1/timeline', '/api/v1/pages']);
  assert.equal(result.posts.total, 0);
  t.mock.method(globalThis, 'fetch', async () => new Response(null, { status: 503 }));
  await assert.rejects(searchContent('a', controller.signal), /搜索失败/);
});
