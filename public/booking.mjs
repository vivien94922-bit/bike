export const VEHICLES = Object.freeze({
  standard: {
    name: '一般單車',
    packages: { unlimited: { label: '不限時間', price: 100 } },
  },
  child: {
    name: '親子車',
    packages: { unlimited: { label: '不限時間', price: 150 } },
  },
  tandem: {
    name: '協力車',
    packages: { unlimited: { label: '不限時間', price: 200 } },
  },
  electric: {
    name: '電動車',
    packages: {
      solo1_5h: { label: '單人・1.5 小時', price: 250, reservationPrice: 200 },
      duo1_5h: { label: '雙人・1.5 小時', price: 350, reservationPrice: 300 },
    },
  },
});

export const BOOKING_DISCOUNT_RATE = 0.8;

export function getBookingPrice(vehicleId, packageId) {
  const vehicle = VEHICLES[vehicleId];
  const rentalPackage = vehicle?.packages?.[packageId];
  if (!Object.hasOwn(VEHICLES, vehicleId) || !rentalPackage) throw new RangeError('請選擇有效的車款與租借時限');
  return rentalPackage.reservationPrice ?? Math.round(rentalPackage.price * BOOKING_DISCOUNT_RATE);
}

export function estimateRental(vehicleId, packageId, quantity) {
  if (!Object.hasOwn(VEHICLES, vehicleId) || !VEHICLES[vehicleId].packages[packageId]) {
    throw new RangeError('請選擇有效的車款與租借時限');
  }
  const count = Number(quantity);
  if (!Number.isInteger(count) || count < 1 || count > 20) throw new RangeError('每種車款租借台數須為 1 到 20 台');
  return getBookingPrice(vehicleId, packageId) * count;
}

export function estimateRentals(vehicles) {
  if (!Array.isArray(vehicles) || vehicles.length === 0) throw new RangeError('請至少選擇一種車款');
  const ids = new Set();
  return vehicles.reduce((total, item) => {
    if (!item || ids.has(item.vehicleId)) throw new RangeError('車款資料重複或格式錯誤');
    ids.add(item.vehicleId);
    return total + estimateRental(item.vehicleId, item.packageId, item.quantity);
  }, 0);
}

export function validateBooking(booking) {
  const errors = [];
  const phone = typeof booking.phone === 'string' ? booking.phone : '';
  const plate = typeof booking.plate === 'string' ? booking.plate.trim() : '';
  const dateValue = typeof booking.date === 'string' ? booking.date : '';
  if (!/^(?:09\d{8}|0[2-8]\d{7,8})$/.test(phone.replace(/[\s-]/g, ''))) errors.push('請填寫有效的台灣聯絡電話');
  const parsedDate = /^\d{4}-\d{2}-\d{2}$/.test(dateValue) ? new Date(`${dateValue}T00:00:00Z`) : null;
  const validCalendarDate = parsedDate && !Number.isNaN(parsedDate.valueOf()) && parsedDate.toISOString().slice(0, 10) === dateValue;
  if (!validCalendarDate || dateValue < new Date().toISOString().slice(0, 10)) errors.push('請選擇今天或之後的取車日期');
  const timeMatch = typeof booking.time === 'string' ? /^(\d{2}):(\d{2})$/.exec(booking.time) : null;
  const timeHour = timeMatch ? Number(timeMatch[1]) : -1;
  const timeMinute = timeMatch ? Number(timeMatch[2]) : -1;
  if (!timeMatch || timeHour < 8 || timeHour > 17 || timeMinute > 59 || (timeHour === 17 && timeMinute > 0) || timeMinute % 15 !== 0) {
    errors.push('請選擇 08:00 至 17:00、每 15 分鐘一個時段的時間');
  }
  if (!Array.isArray(booking.vehicles) || booking.vehicles.length === 0) errors.push('請至少選擇一種車款');
  else {
    const ids = new Set();
    for (const item of booking.vehicles) {
      if (!item || typeof item !== 'object' || !Object.hasOwn(VEHICLES, item.vehicleId)) {
        errors.push('請選擇有效的車款');
        continue;
      }
      if (ids.has(item.vehicleId)) errors.push('同一車款請合併輸入租借台數');
      ids.add(item.vehicleId);
      if (!Object.hasOwn(VEHICLES[item.vehicleId].packages, item.packageId)) errors.push('請選擇此車種適用的租借時限');
      else {
        try { estimateRental(item.vehicleId, item.packageId, item.quantity); }
        catch (error) { errors.push(error.message); }
      }
    }
  }
  if (typeof booking.plate !== 'undefined' && typeof booking.plate !== 'string') errors.push('車牌格式錯誤');
  else if (plate.length > 20) errors.push('車牌不可超過 20 個字');
  return errors;
}
