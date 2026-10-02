export const VEHICLES = Object.freeze({
  city: { name: '湖畔漫遊車', price: 350 },
  electric: { name: '輕旅電輔車', price: 650 },
  family: { name: '一起出發車', price: 800 },
});

export function estimateRental(vehicleId, quantity) {
  const vehicle = VEHICLES[vehicleId];
  const count = Number(quantity);
  if (!vehicle) throw new RangeError('請選擇有效的車款');
  if (!Number.isInteger(count) || count < 1 || count > 4) {
    throw new RangeError('租借台數須為 1 到 4 台');
  }
  return vehicle.price * count;
}

export function validateBooking(booking) {
  const errors = [];
  if (!booking.name?.trim()) errors.push('請填寫稱呼');
  if (!/^09\d{8}$/.test((booking.phone ?? '').replace(/[\s-]/g, ''))) errors.push('請填寫有效的台灣手機號碼');
  if (!booking.date) errors.push('請選擇取車日期');
  if (!booking.time) errors.push('請選擇取車時段');
  if (!VEHICLES[booking.vehicle]) errors.push('請選擇車款');
  try {
    estimateRental(booking.vehicle, booking.quantity);
  } catch (error) {
    errors.push(error.message);
  }
  return errors;
}
