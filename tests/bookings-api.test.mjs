import test from 'node:test';
import assert from 'node:assert/strict';
import { onRequestPost } from '../functions/api/bookings.js';

const validBooking = {
  phone: '0912-345-678', plate: 'ABC-1234',
  date: new Date(Date.now() + 86_400_000).toISOString().slice(0, 10),
  time: '09:00', vehicles: [
    { vehicleId: 'electric', packageId: 'duo1_5h', quantity: '2' },
    { vehicleId: 'standard', packageId: 'unlimited', quantity: '1' },
  ],
};
const requestFor = (body, headers = { 'content-type': 'application/json' }) => new Request('https://example.test/api/bookings', {
  method: 'POST', headers, body: JSON.stringify(body),
});
const configuredEnv = {
  GOOGLE_SHEETS_WEBHOOK_URL: 'https://script.example.test/exec',
  GOOGLE_SHEETS_TOKEN: 'test-sheets-token',
};

test('拒絕無效欄位，且不呼叫後端', async () => {
  const response = await onRequestPost({ request: requestFor({ ...validBooking, phone: 'bad' }), env: configuredEnv });
  assert.equal(response.status, 400);
  assert.match((await response.json()).message, /電話/);
});

test('API 拒絕不在營業預約時段或非 15 分鐘間隔的時間', async () => {
  for (const time of ['07:45', '08:01', '17:15']) {
    const response = await onRequestPost({ request: requestFor({ ...validBooking, time }), env: configuredEnv });
    assert.equal(response.status, 400);
    assert.match((await response.json()).message, /08:00 至 17:00、每 15 分鐘/);
  }
});

test('Google 試算表設定未完成時不回報成功', async () => {
  const response = await onRequestPost({ request: requestFor(validBooking), env: {} });
  assert.equal(response.status, 503);
  assert.match((await response.json()).message, /GOOGLE_SHEETS_WEBHOOK_URL、GOOGLE_SHEETS_TOKEN/);
});

test('Google 試算表設定錯誤時指出缺少的 Cloudflare Production 變數名稱', async () => {
  const response = await onRequestPost({
    request: requestFor(validBooking),
    env: { GOOGLE_SHEETS_WEBHOOK_URL: configuredEnv.GOOGLE_SHEETS_WEBHOOK_URL },
  });
  assert.equal(response.status, 503);
  assert.match((await response.json()).message, /缺少：GOOGLE_SHEETS_TOKEN/);
});

test('寫入試算表成功後回傳預約編號和待確認狀態，且完全不寄信', async () => {
  const originalFetch = globalThis.fetch;
  let sheetPayload;
  globalThis.fetch = async (url, options) => {
    assert.equal(url, configuredEnv.GOOGLE_SHEETS_WEBHOOK_URL);
    sheetPayload = JSON.parse(options.body);
    return Response.json({ success: true });
  };
  try {
    const response = await onRequestPost({ request: requestFor(validBooking), env: configuredEnv });
    const result = await response.json();
    assert.equal(response.status, 201);
    assert.match(result.requestId, /^SR-[A-F0-9]{8}$/);
    assert.equal(result.status, '待確認');
    assert.equal(sheetPayload.token, configuredEnv.GOOGLE_SHEETS_TOKEN);
    assert.equal(sheetPayload.name, '');
    assert.equal(sheetPayload.email, '');
    assert.equal(sheetPayload.note, '');
    assert.equal(sheetPayload.date, validBooking.date);
    assert.equal(sheetPayload.time, validBooking.time);
    assert.equal(sheetPayload.plate, 'ABC-1234');
    assert.equal(sheetPayload.estimatedTotal, 680);
    assert.equal(sheetPayload.vehicles.length, 2);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('即使設定 Resend，也不會呼叫郵件服務', async () => {
  const originalFetch = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (url) => {
    calls.push(url);
    return Response.json({ success: true });
  };
  try {
    const response = await onRequestPost({
      request: requestFor(validBooking),
      env: { ...configuredEnv, RESEND_API_KEY: 'unused', BOOKING_FROM_EMAIL: 'unused@example.test' },
    });
    assert.equal(response.status, 201);
    assert.deepEqual(calls, [configuredEnv.GOOGLE_SHEETS_WEBHOOK_URL]);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('試算表未確認寫入時不回報成功', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => Response.json({ success: false });
  try {
    const response = await onRequestPost({ request: requestFor(validBooking), env: configuredEnv });
    assert.equal(response.status, 502);
    assert.match((await response.json()).message, /沒有寫入 Google 試算表/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
