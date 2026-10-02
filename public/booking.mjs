export const VEHICLES = Object.freeze({
  standard: {
    name: '一般單車',
    packages: {
      limited: { label: '限時 1.5 小時', price: 70, reservationPrice: 50 },
      unlimited: { label: '不限時間', price: 100 },
    },
  },
  child: {
    name: '親子車',
    packages: {
      limited: { label: '限時 1.5 小時', price: 100 },
      unlimited: { label: '不限時間', price: 150 },
    },
  },
  tandem: {
    name: '協力車',
    packages: {
      limited: { label: '限時 1.5 小時', price: 200 },
      unlimited: { label: '不限時間', price: 250 },
    },
  },
  electric: {
    name: '電動車',
    packages: {
      electric3h: { label: '3 小時', price: 350, reservationPrice: 300 },
    },
  },
});
export const BOOKING_DISCOUNT_RATE = 0.8;

export function estimateRental(vehicleId, packageId, quantity) {
  const vehicle = VEHICLES[vehicleId];
  const rentalPackage = vehicle?.packages?.[packageId];
  const count = Number(quantity);
  if (!Object.hasOwn(VEHICLES, vehicleId) || !rentalPackage) throw new RangeError('請選擇有效的車款與租借時限');
  if (!Number.isInteger(count) || count < 1 || count > 20) {
    throw new RangeError('每種車款租借台數須為 1 到 20 台');
  }
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

export function getBookingPrice(vehicleId, packageId) {
  const vehicle = VEHICLES[vehicleId];
  const rentalPackage = vehicle?.packages?.[packageId];
  if (!Object.hasOwn(VEHICLES, vehicleId) || !rentalPackage) throw new RangeError('請選擇有效的車款與租借時限');
  return rentalPackage.reservationPrice ?? Math.round(rentalPackage.price * BOOKING_DISCOUNT_RATE);
}

export function validateBooking(booking) {
  const errors = [];
  const name = typeof booking.name === 'string' ? booking.name.trim() : '';
  const phone = typeof booking.phone === 'string' ? booking.phone : '';
  const email = typeof booking.email === 'string' ? booking.email.trim() : '';
  const dateValue = typeof booking.date === 'string' ? booking.date : '';
  const note = typeof booking.note === 'string' ? booking.note : '';
  if (!name || name.length > 80) errors.push('請填寫稱呼（最多 80 字）');
  if (!/^(?:09\d{8}|0[2-8]\d{7,8})$/.test(phone.replace(/[\s-]/g, ''))) errors.push('請填寫有效的台灣聯絡電話');
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.push('請填寫有效的電子郵件');
  const parsedDate = /^\d{4}-\d{2}-\d{2}$/.test(dateValue) ? new Date(`${dateValue}T00:00:00Z`) : null;
  const validCalendarDate = parsedDate && !Number.isNaN(parsedDate.valueOf()) && parsedDate.toISOString().slice(0, 10) === dateValue;
  if (!validCalendarDate || dateValue < new Date().toISOString().slice(0, 10)) errors.push('請選擇今天或之後的取車日期');
  if (typeof booking.time !== 'string' || !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(booking.time)) errors.push('請選擇有效的取車時間');
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
      if (!Object.hasOwn(VEHICLES[item.vehicleId].packages, item.packageId)) {
        errors.push('請選擇此車種適用的租借時限');
      } else {
        try {
          estimateRental(item.vehicleId, item.packageId, item.quantity);
        } catch (error) {
          errors.push(error.message);
        }
      }
    }
  }
  if (typeof booking.note !== 'undefined' && typeof booking.note !== 'string') errors.push('備註格式錯誤');
  else if (note.length > 1000) errors.push('備註不可超過 1000 字');
  return errors;
}
