import test from 'node:test';
import assert from 'node:assert/strict';
import { estimateRental, validateBooking } from '../booking.mjs';

test('估算各車款半日租金與多台費用', () => {
  assert.equal(estimateRental('city', 1), 350);
  assert.equal(estimateRental('electric', 2), 1300);
  assert.equal(estimateRental('family', 4), 3200);
});

test('拒絕不存在的車款或超出展示範圍的台數', () => {
  assert.throws(() => estimateRental('unknown', 1), /有效的車款/);
  assert.throws(() => estimateRental('city', 0), /1 到 4 台/);
  assert.throws(() => estimateRental('city', 1.5), /1 到 4 台/);
});

test('完整且有效的預約資料可通過檢查', () => {
  assert.deepEqual(validateBooking({
    name: '王小明', phone: '0912-345-678', date: '2026-10-12',
    time: '09:00 – 10:00', vehicle: 'electric', quantity: '2',
  }), []);
});

test('回報缺漏欄位與錯誤電話', () => {
  assert.deepEqual(validateBooking({ name: ' ', phone: '123', date: '', time: '', vehicle: 'nope', quantity: '7' }), [
    '請填寫稱呼', '請填寫有效的台灣手機號碼', '請選擇取車日期', '請選擇取車時段', '請選擇車款', '請選擇有效的車款',
  ]);
});
