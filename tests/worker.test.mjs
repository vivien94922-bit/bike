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

test('Worker 會將預約 POST 路由到 Sheets 預約 API，而不是靜態資產', async () => {
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

test('Worker 將評論讀取和送出交給評論 API', async () => {
  const getResponse = await worker.fetch(new Request('https://bike.example.test/api/reviews'), {
    GOOGLE_SHEETS_WEBHOOK_URL: '',
    GOOGLE_SHEETS_TOKEN: '',
    ASSETS: { fetch: async () => new Response('asset') },
  });
  assert.equal(getResponse.status, 200);
  assert.deepEqual(await getResponse.json(), { reviews: [] });

  const postResponse = await worker.fetch(new Request('https://bike.example.test/api/reviews', {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ rating: 9 }),
  }), { ASSETS: { fetch: async () => new Response('asset') } });
  assert.equal(postResponse.status, 400);
});
