import test from 'node:test';
import assert from 'node:assert/strict';
import { estimateRental, estimateRentals, getBookingPrice, validateBooking, VEHICLES } from '../public/booking.mjs';

test('依車款、租借時限與台數估算費用', () => {
  assert.equal(estimateRental('standard', 'unlimited', 1), 80);
  assert.equal(estimateRental('standard', 'unlimited', 2), 160);
  assert.equal(estimateRental('child', 'unlimited', 1), 120);
  assert.equal(estimateRental('child', 'unlimited', 2), 240);
  assert.equal(estimateRental('tandem', 'unlimited', 1), 160);
  assert.equal(estimateRental('tandem', 'unlimited', 2), 320);
  assert.equal(estimateRental('electric', 'solo1_5h', 1), 200);
  assert.equal(estimateRental('electric', 'duo1_5h', 1), 300);
});

test('拒絕不存在的車款或超出展示範圍的台數', () => {
  assert.throws(() => estimateRental('unknown', 1), /有效的車款/);
  assert.throws(() => estimateRental('toString', 1), /有效的車款/);
  assert.throws(() => estimateRental('standard', 'unlimited', 0), /1 到 20 台/);
  assert.throws(() => estimateRental('standard', 'unlimited', 1.5), /1 到 20 台/);
  assert.throws(() => estimateRental('standard', 'limited', 1), /有效的車款與租借時限/);
  assert.throws(() => estimateRental('electric', 'unlimited', 1), /有效的車款與租借時限/);
});

test('非字串欄位會回報驗證錯誤而不拋出執行錯誤', () => {
  assert.deepEqual(validateBooking({
    phone: 912345678, date: null, time: null,
    vehicles: [{ vehicleId: 'toString', packageId: 'unlimited', quantity: 1 }],
  }), [
    '請填寫有效的台灣聯絡電話',
    '請選擇今天或之後的取車日期', '請選擇 08:00 至 17:00、每 15 分鐘一個時段的時間', '請選擇有效的車款',
  ]);
});

test('只提供電話、日期、時間、車牌和車款即可通過預約資料檢查', () => {
  assert.deepEqual(validateBooking({
    phone: '0912-345-678', plate: 'ABC-1234', date: '2026-10-12',
    time: '09:00', vehicles: [{ vehicleId: 'electric', packageId: 'duo1_5h', quantity: '2' }],
  }), []);
});

test('回報缺漏欄位與錯誤電話', () => {
  assert.deepEqual(validateBooking({ phone: '123', date: '', time: '', vehicles: [] }), [
    '請填寫有效的台灣聯絡電話', '請選擇今天或之後的取車日期',
    '請選擇 08:00 至 17:00、每 15 分鐘一個時段的時間', '請至少選擇一種車款',
  ]);
});

test('接受台灣手機與市話格式', () => {
  const base = {
    name: '陳小姐', phone: '02-2499-1585', email: 'rider@example.com', date: new Date(Date.now() + 86_400_000).toISOString().slice(0, 10),
    time: '09:30', vehicles: [{ vehicleId: 'standard', packageId: 'unlimited', quantity: '1' }],
  };
  assert.deepEqual(validateBooking(base), []);
  assert.deepEqual(validateBooking({ ...base, phone: '0912-345-678' }), []);
});

test('取車時間限制為 08:00 至 17:00，並以 15 分鐘為間隔', () => {
  const base = {
    name: '陳小姐', phone: '0912345678', email: 'rider@example.com', date: new Date(Date.now() + 86_400_000).toISOString().slice(0, 10),
    time: '08:00', vehicles: [{ vehicleId: 'standard', packageId: 'unlimited', quantity: '1' }],
  };
  for (const time of ['08:00', '08:15', '12:30', '16:45', '17:00']) assert.deepEqual(validateBooking({ ...base, time }), []);
  for (const time of ['07:45', '08:01', '16:59', '17:01', '17:15', '09:75', 'bad']) {
    assert.ok(validateBooking({ ...base, time }).includes('請選擇 08:00 至 17:00、每 15 分鐘一個時段的時間'), time);
  }
});

test('自駕車牌為選填且限制格式長度', () => {
  const base = {
    name: '陳小姐', phone: '0912345678', email: 'rider@example.com', date: new Date(Date.now() + 86_400_000).toISOString().slice(0, 10),
    time: '09:00', vehicles: [{ vehicleId: 'standard', packageId: 'unlimited', quantity: '1' }],
  };
  assert.deepEqual(validateBooking(base), []);
  assert.deepEqual(validateBooking({ ...base, plate: 'ABC-1234' }), []);
  assert.ok(validateBooking({ ...base, plate: {} }).includes('車牌格式錯誤'));
  assert.ok(validateBooking({ ...base, plate: 'X'.repeat(21) }).includes('車牌不可超過 20 個字'));
});

test('拒絕過去日期、未知時段和無效車款', () => {
  const errors = validateBooking({
    phone: '0912345678', date: '2020-01-01', time: '25:30',
    vehicles: [{ vehicleId: 'standard', packageId: 'invalid', quantity: '1' }],
  });
  assert.deepEqual(errors, [
    '請選擇今天或之後的取車日期', '請選擇 08:00 至 17:00、每 15 分鐘一個時段的時間', '請選擇此車種適用的租借時限',
  ]);
});

test('多種車款可同筆預約並合計正確預約價', () => {
  const vehicles = [
    { vehicleId: 'standard', packageId: 'unlimited', quantity: '2' },
    { vehicleId: 'child', packageId: 'unlimited', quantity: '1' },
    { vehicleId: 'electric', packageId: 'duo1_5h', quantity: '1' },
  ];
  assert.equal(estimateRentals(vehicles), 80 * 2 + 120 + 300);
  const base = {
    name: '林小姐', phone: '0912345678', email: 'rider@example.com', date: new Date(Date.now() + 86_400_000).toISOString().slice(0, 10),
    time: '09:30', vehicles,
  };
  assert.deepEqual(validateBooking(base), []);
  assert.ok(validateBooking({ ...base, vehicles: [...vehicles, vehicles[0]] }).includes('同一車款請合併輸入租借台數'));
});

test('驗證所有仍提供車種和方案的預約優惠價', () => {
  for (const [vehicle, packageId, price] of [
    ['standard', 'unlimited', 80],
    ['child', 'unlimited', 120],
    ['tandem', 'unlimited', 160],
    ['electric', 'solo1_5h', 200], ['electric', 'duo1_5h', 300],
  ]) {
    assert.equal(getBookingPrice(vehicle, packageId), price);
    assert.equal(estimateRental(vehicle, packageId, 1), price);
  }
  assert.deepEqual(Object.keys(VEHICLES.standard.packages), ['unlimited']);
  assert.deepEqual(Object.keys(VEHICLES.child.packages), ['unlimited']);
  assert.deepEqual(Object.keys(VEHICLES.tandem.packages), ['unlimited']);
  assert.deepEqual(Object.keys(VEHICLES.electric.packages), ['solo1_5h', 'duo1_5h']);
});
