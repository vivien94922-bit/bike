import test from 'node:test';
import assert from 'node:assert/strict';
import worker from '../src/worker.js';

test('Worker 將網站請求交給靜態資產服務', async () => {
  const request = new Request('https://bike.example.test/');
  const expected = new Response('site');
  const response = await worker.fetch(request, { ASSETS: { fetch: async (actual) => {
    assert.equal(actual.url, request.url);
    return expected;
  } } });
  assert.equal(response, expected);
});

test('Worker 會將預約 POST 路由到寄信 API，而不是靜態資產', async () => {
  const request = new Request('https://bike.example.test/api/bookings', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({}),
  });
  let assetRequested = false;
  const response = await worker.fetch(request, { ASSETS: { fetch: async () => {
    assetRequested = true;
    return new Response('asset');
  } } });
  assert.equal(response.status, 400);
  assert.equal(assetRequested, false);
});

test('Worker 不接受非 POST 預約請求', async () => {
  const response = await worker.fetch(new Request('https://bike.example.test/api/bookings'), {
    ASSETS: { fetch: async () => new Response('asset') },
  });
  assert.equal(response.status, 405);
});
