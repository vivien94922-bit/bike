import test from 'node:test';
import assert from 'node:assert/strict';
import { onRequestPost } from '../functions/api/bookings.js';

const validBooking = {
  name: '王小明', phone: '0912-345-678', email: 'rider@example.com',
  date: new Date(Date.now() + 86_400_000).toISOString().slice(0, 10),
  time: '09:00', vehicles: [
    { vehicleId: 'electric', packageId: 'electric3h', quantity: '2' },
    { vehicleId: 'standard', packageId: 'limited', quantity: '1' },
  ], note: '上午到店',
};
const requestFor = (body, headers = { 'content-type': 'application/json' }) => new Request('https://example.test/api/bookings', {
  method: 'POST', headers, body: JSON.stringify(body),
});
const configuredEnv = {
  RESEND_API_KEY: 'test-api-key',
  BOOKING_TO_EMAIL: 'shop@example.test',
  BOOKING_FROM_EMAIL: 'Bookings <bookings@example.test>',
};

test('拒絕無效欄位，且不呼叫郵件服務', async () => {
  const response = await onRequestPost({ request: requestFor({ ...validBooking, phone: 'bad' }), env: configuredEnv });
  assert.equal(response.status, 400);
  assert.match((await response.json()).message, /電話/);
});

test('郵件環境設定未完成時不假報成功', async () => {
  const response = await onRequestPost({ request: requestFor(validBooking), env: {} });
  assert.equal(response.status, 503);
  assert.match((await response.json()).message, /沒有送出/);
});

test('成功送出後寄送完整需求並回傳需求編號', async () => {
  const originalFetch = globalThis.fetch;
  const sentEmails = [];
  globalThis.fetch = async (url, options) => {
    assert.equal(url, 'https://api.resend.com/emails');
    sentEmails.push(JSON.parse(options.body));
    return new Response('{}', { status: 200 });
  };
  try {
    const response = await onRequestPost({ request: requestFor(validBooking), env: configuredEnv });
    const result = await response.json();
    assert.equal(response.status, 201);
    assert.match(result.requestId, /^SR-[A-F0-9]{8}$/);
    assert.equal(sentEmails.length, 2);
    const ownerEmail = sentEmails.find(({ to }) => to.includes(configuredEnv.BOOKING_TO_EMAIL));
    const customerEmail = sentEmails.find(({ to }) => to.includes(validBooking.email));
    assert.ok(ownerEmail);
    assert.ok(customerEmail);
    assert.match(ownerEmail.text, /0912-345-678/);
    assert.match(ownerEmail.text, /確認車輛與時段/);
    assert.match(ownerEmail.text, /3 小時/);
    assert.match(ownerEmail.text, /一般單車・限時 1\.5 小時 × 1 台/);
    assert.match(ownerEmail.text, /NT\$ 650/);
    assert.match(customerEmail.subject, /已收到您的租車需求/);
    assert.match(customerEmail.text, /尚不代表預約成立/);
    assert.match(customerEmail.text, /預約日前一天來電告知/);
    assert.doesNotMatch(ownerEmail.text, /取車方式/);
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
