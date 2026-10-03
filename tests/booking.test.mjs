import test from 'node:test';
import assert from 'node:assert/strict';
import { estimateRental, estimateRentals, getBookingPrice, validateBooking } from '../public/booking.mjs';

test('依車款、租借時限與台數估算費用', () => {
  assert.equal(estimateRental('standard', 'limited', 1), 50);
  assert.equal(estimateRental('standard', 'unlimited', 2), 160);
  assert.equal(estimateRental('child', 'limited', 1), 80);
  assert.equal(estimateRental('child', 'unlimited', 2), 240);
  assert.equal(estimateRental('tandem', 'limited', 1), 160);
  assert.equal(estimateRental('tandem', 'unlimited', 2), 400);
  assert.equal(estimateRental('electric', 'electric3h', 2), 600);
});

test('拒絕不存在的車款或超出展示範圍的台數', () => {
  assert.throws(() => estimateRental('unknown', 1), /有效的車款/);
  assert.throws(() => estimateRental('toString', 1), /有效的車款/);
  assert.throws(() => estimateRental('standard', 'limited', 0), /1 到 20 台/);
  assert.throws(() => estimateRental('standard', 'limited', 1.5), /1 到 20 台/);
  assert.throws(() => estimateRental('electric', 'unlimited', 1), /有效的車款與租借時限/);
});

test('非字串欄位會回報驗證錯誤而不拋出執行錯誤', () => {
  assert.deepEqual(validateBooking({
    name: 123, phone: 912345678, email: null, date: null, time: null,
    vehicles: [{ vehicleId: 'toString', packageId: 'unlimited', quantity: 1 }], note: {},
  }), [
    '請填寫稱呼（最多 80 字）', '請填寫有效的台灣聯絡電話', '請填寫有效的電子郵件',
    '請選擇今天或之後的取車日期', '請選擇有效的取車時間', '請選擇有效的車款', '備註格式錯誤',
  ]);
});

test('完整且有效的預約資料可通過檢查', () => {
  assert.deepEqual(validateBooking({
    name: '王小明', phone: '0912-345-678', email: 'rider@example.com', date: '2026-10-12',
    time: '09:00', vehicles: [{ vehicleId: 'electric', packageId: 'electric3h', quantity: '2' }],
  }), []);
});

test('回報缺漏欄位與錯誤電話', () => {
  assert.deepEqual(validateBooking({ name: ' ', phone: '123', email: '', date: '', time: '', vehicles: [] }), [
    '請填寫稱呼（最多 80 字）', '請填寫有效的台灣聯絡電話', '請填寫有效的電子郵件', '請選擇今天或之後的取車日期',
    '請選擇有效的取車時間', '請至少選擇一種車款',
  ]);
});

test('接受台灣手機與市話格式', () => {
  const base = {
    name: '陳小姐', phone: '02-2499-1585', email: 'rider@example.com', date: new Date(Date.now() + 86_400_000).toISOString().slice(0, 10),
    time: '09:30', vehicles: [{ vehicleId: 'standard', packageId: 'limited', quantity: '1' }],
  };
  assert.deepEqual(validateBooking(base), []);
  assert.deepEqual(validateBooking({ ...base, phone: '0912-345-678' }), []);
});

test('拒絕過去日期、未知時段、無效車款和過長備註', () => {
  const errors = validateBooking({
    name: '王小明', phone: '0912345678', email: 'rider@example.com', date: '2020-01-01', time: '25:30',
    vehicles: [{ vehicleId: 'standard', packageId: 'invalid', quantity: '1' }], note: 'x'.repeat(1001),
  });
  assert.deepEqual(errors, [
    '請選擇今天或之後的取車日期', '請選擇有效的取車時間', '請選擇此車種適用的租借時限', '備註不可超過 1000 字',
  ]);
});

test('多種車款可同筆預約並合計各自折扣後金額', () => {
  const vehicles = [
    { vehicleId: 'standard', packageId: 'limited', quantity: '2' },
    { vehicleId: 'child', packageId: 'unlimited', quantity: '1' },
    { vehicleId: 'electric', packageId: 'electric3h', quantity: '1' },
  ];
  assert.equal(estimateRentals(vehicles), 50 * 2 + 120 + 300);
  const base = {
    name: '林小姐', phone: '0912345678', email: 'rider@example.com', date: new Date(Date.now() + 86_400_000).toISOString().slice(0, 10),
    time: '09:30', vehicles,
  };
  assert.deepEqual(validateBooking(base), []);
  assert.ok(validateBooking({ ...base, vehicles: [...vehicles, vehicles[0]] }).includes('同一車款請合併輸入租借台數'));
});

test('驗證每個車種和方案的預約優惠價', () => {
  for (const [vehicle, packageId, price] of [
    ['standard', 'limited', 70], ['standard', 'unlimited', 100],
    ['child', 'limited', 100], ['child', 'unlimited', 150],
    ['tandem', 'limited', 200], ['tandem', 'unlimited', 250],
    ['electric', 'electric3h', 350],
  ]) {
    const expected = vehicle === 'standard' && packageId === 'limited' ? 50
      : vehicle === 'electric' ? 300 : price * 0.8;
    assert.equal(getBookingPrice(vehicle, packageId), expected);
    assert.equal(estimateRental(vehicle, packageId, 1), expected);
  }
});
