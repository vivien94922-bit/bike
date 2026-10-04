import test from 'node:test';
import assert from 'node:assert/strict';
import { onRequestPost } from '../functions/api/bookings.js';

const validBooking = {
  name: '王小明', phone: '0912-345-678', email: 'rider@example.com', plate: 'ABC-1234',
  date: new Date(Date.now() + 86_400_000).toISOString().slice(0, 10),
  time: '09:00', vehicles: [
    { vehicleId: 'electric', packageId: 'duo3h', quantity: '2' },
    { vehicleId: 'standard', packageId: 'unlimited', quantity: '1' },
  ], note: '上午到店',
};
const requestFor = (body, headers = { 'content-type': 'application/json' }) => new Request('https://example.test/api/bookings', {
  method: 'POST', headers, body: JSON.stringify(body),
});
const configuredEnv = {
  RESEND_API_KEY: 'test-api-key',
  BOOKING_TO_EMAIL: 'shop@example.test',
  BOOKING_FROM_EMAIL: 'Bookings <bookings@example.test>',
  GOOGLE_SHEETS_WEBHOOK_URL: 'https://script.example.test/exec',
  GOOGLE_SHEETS_TOKEN: 'test-sheets-token',
};

test('拒絕無效欄位，且不呼叫郵件服務', async () => {
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

test('郵件環境設定未完成時不假報成功', async () => {
  const response = await onRequestPost({ request: requestFor(validBooking), env: {} });
  assert.equal(response.status, 503);
  assert.match((await response.json()).message, /沒有送出/);
});

test('Google 試算表設定未完成時不寄信也不回報成功', async () => {
  const response = await onRequestPost({ request: requestFor(validBooking), env: { ...configuredEnv, GOOGLE_SHEETS_TOKEN: '' } });
  assert.equal(response.status, 503);
  assert.match((await response.json()).message, /Google 試算表尚未完成/);
});

test('成功送出後寄送完整需求並回傳需求編號', async () => {
  const originalFetch = globalThis.fetch;
  const sentEmails = [];
  const sheetRows = [];
  globalThis.fetch = async (url, options) => {
    if (url === 'https://api.resend.com/emails') {
      sentEmails.push(JSON.parse(options.body));
      return new Response('{}', { status: 200 });
    }
    assert.equal(url, configuredEnv.GOOGLE_SHEETS_WEBHOOK_URL);
    sheetRows.push(JSON.parse(options.body));
    assert.equal(JSON.parse(options.body).token, configuredEnv.GOOGLE_SHEETS_TOKEN);
    return Response.json({ success: true });
  };
  try {
    const response = await onRequestPost({ request: requestFor(validBooking), env: configuredEnv });
    const result = await response.json();
    assert.equal(response.status, 201);
    assert.match(result.requestId, /^SR-[A-F0-9]{8}$/);
    assert.equal(sentEmails.length, 2);
    assert.equal(sheetRows.length, 1);
    assert.equal(sheetRows[0].name, validBooking.name);
    assert.equal(sheetRows[0].estimatedTotal, 880);
    assert.equal(sheetRows[0].vehicles.length, 2);
    assert.equal(sheetRows[0].plate, 'ABC-1234');
    const ownerEmail = sentEmails.find(({ to }) => to.includes(configuredEnv.BOOKING_TO_EMAIL));
    const customerEmail = sentEmails.find(({ to }) => to.includes(validBooking.email));
    assert.ok(ownerEmail);
    assert.ok(customerEmail);
    assert.match(ownerEmail.text, /0912-345-678/);
    assert.match(ownerEmail.text, /確認車輛與時段/);
    assert.match(ownerEmail.text, /自駕車牌：ABC-1234/);
    assert.match(ownerEmail.text, /3 小時/);
    assert.match(ownerEmail.text, /一般單車・不限時間 × 1 台/);
    assert.match(ownerEmail.text, /電動車・雙人・3 小時 × 2 台（預約優惠單價 NT\$ 400）/);
    assert.match(ownerEmail.text, /NT\$ 880/);
    assert.match(customerEmail.subject, /已收到您的租車需求/);
    assert.match(customerEmail.text, /尚不代表預約成立/);
    assert.match(customerEmail.text, /自駕車牌：ABC-1234/);
    assert.match(customerEmail.text, /預約日前一天來電告知/);
    assert.doesNotMatch(ownerEmail.text, /取車方式/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('試算表未確認寫入時明確告知郵件已寄出並避免重複送出', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url) => url === 'https://api.resend.com/emails'
    ? new Response('{}', { status: 200 })
    : Response.json({ success: false });
  try {
    const response = await onRequestPost({ request: requestFor(validBooking), env: configuredEnv });
    assert.equal(response.status, 502);
    const result = await response.json();
    assert.match(result.message, /郵件已寄出，但 Google 試算表未確認寫入/);
    assert.match(result.message, /請不要重複送出/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('郵件提供者失敗時回傳錯誤而不產生成功回執', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response('{}', { status: 500 });
  try {
    const response = await onRequestPost({ request: requestFor(validBooking), env: configuredEnv });
    assert.equal(response.status, 502);
    assert.match((await response.json()).message, /系統未回報預約成功/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
