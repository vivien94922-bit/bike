import test from 'node:test';
import assert from 'node:assert/strict';
import { onRequestGet, onRequestPost } from '../functions/api/reviews.js';

const env = {
  GOOGLE_SHEETS_WEBHOOK_URL: 'https://script.example.test/exec',
  GOOGLE_SHEETS_TOKEN: 'test-reviews-token',
};
const review = { name: '海邊旅人', rating: 5, comment: '單車很好騎，沿途風景很美。', consent: true };
const requestFor = (body, headers = { 'content-type': 'application/json' }) => new Request('https://bike.example.test/api/reviews', {
  method: 'POST', headers, body: JSON.stringify(body),
});

test('拒絕無效星等、過短留言和未確認公開的回饋', async () => {
  for (const [input, expected] of [
    [{ ...review, rating: 6 }, /1 至 5 顆星/],
    [{ ...review, comment: '好' }, /5 至 1000 個字/],
    [{ ...review, consent: false }, /確認留言會公開顯示/],
  ]) {
    const response = await onRequestPost({ request: requestFor(input), env });
    assert.equal(response.status, 400);
    assert.match((await response.json()).message, expected);
  }
});

test('匿名旅人可以送出評論，服務將評分和留言立即公開', async () => {
  const originalFetch = globalThis.fetch;
  let payload;
  globalThis.fetch = async (url, options) => {
    assert.equal(url, env.GOOGLE_SHEETS_WEBHOOK_URL);
    payload = JSON.parse(options.body);
    return Response.json({ success: true });
  };
  try {
    const response = await onRequestPost({ request: requestFor({ ...review, name: '' }), env });
    const result = await response.json();
    assert.equal(response.status, 201);
    assert.match(result.reviewId, /^RV-[A-F0-9]{8}$/);
    assert.equal(result.status, 'published');
    assert.equal(payload.type, 'review');
    assert.equal(payload.name, '匿名旅人');
    assert.equal(payload.rating, 5);
    assert.match(payload.token, /test-reviews-token/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('Google 試算表失敗時不回報留言成功', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => Response.json({ success: false });
  try {
    const response = await onRequestPost({ request: requestFor(review), env });
    assert.equal(response.status, 502);
    assert.match((await response.json()).message, /沒有成功送出/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('公開評論 API 只轉送試算表中的公開評論', async () => {
  const originalFetch = globalThis.fetch;
  const approved = [{ name: '小安', rating: 4, comment: '一路風景很舒服。' }];
  globalThis.fetch = async (url) => {
    assert.match(url, /action=reviews/);
    return Response.json({ reviews: approved });
  };
  try {
    const response = await onRequestGet({ env });
    assert.equal(response.status, 200);
    assert.deepEqual((await response.json()).reviews, approved);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
