import { estimateRentals, getBookingPrice, validateBooking, VEHICLES } from '../../public/booking.mjs';

const json = (body, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
});

export async function onRequestPost({ request, env }) {
  if (!request.headers.get('content-type')?.toLowerCase().includes('application/json')) {
    return json({ message: '請使用有效的表單格式重新送出。' }, 415);
  }

  const contentLength = Number(request.headers.get('content-length') || 0);
  if (contentLength > 12_000) return json({ message: '表單資料過長，請檢查填寫內容後重試。' }, 413);

  let booking;
  try {
    booking = await request.json();
  } catch {
    return json({ message: '表單資料格式錯誤，請重新送出。' }, 400);
  }
  if (!booking || typeof booking !== 'object' || Array.isArray(booking)) {
    return json({ message: '表單資料格式錯誤，請重新送出。' }, 400);
  }
  if (booking.website) return json({ requestId: crypto.randomUUID() }, 202);

  const errors = validateBooking(booking);
  if (errors.length) return json({ message: errors[0], errors }, 400);
  const missingSettings = ['GOOGLE_SHEETS_WEBHOOK_URL', 'GOOGLE_SHEETS_TOKEN'].filter((key) => !env[key]);
  if (missingSettings.length) {
    return json({ message: `Google 試算表連線尚未完成，需求沒有送出。Cloudflare Worker Production 缺少：${missingSettings.join('、')}。請確認變數名稱與正式環境部署後再試，或致電 02-2499-1585。` }, 503);
  }

  const requestId = `SR-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
  const vehicles = booking.vehicles.map(({ vehicleId, packageId, quantity }) => ({
    name: VEHICLES[vehicleId].name,
    package: VEHICLES[vehicleId].packages[packageId].label,
    quantity: Number(quantity),
    unitPrice: getBookingPrice(vehicleId, packageId),
  }));
  const estimatedTotal = estimateRentals(booking.vehicles);
  const sheetPayload = {
    token: env.GOOGLE_SHEETS_TOKEN,
    requestId,
    name: '',
    phone: booking.phone.trim(),
    email: '',
    plate: booking.plate?.trim() || '',
    date: booking.date,
    time: booking.time,
    vehicles,
    estimatedTotal,
    note: '',
  };

  try {
    const sheetResponse = await fetch(env.GOOGLE_SHEETS_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(sheetPayload),
    });
    const sheetResult = await sheetResponse.json().catch(() => ({}));
    if (!sheetResponse.ok || sheetResult.success !== true) {
      return json({ message: '預約資料沒有寫入 Google 試算表，需求尚未送出。請稍後重試或致電 02-2499-1585。' }, 502);
    }
  } catch (error) {
    const detail = error instanceof Error
      ? error.message.replace(/https?:\/\/[^\s)]+/g, '[URL]')
      : 'Unknown error';
    console.error(`[booking] Google Sheets request failed: ${detail}`);
    return json({ message: '目前無法連線至 Google 試算表，需求尚未送出。請稍後重試或致電 02-2499-1585。' }, 502);
  }

  return json({ requestId, status: '待確認' }, 201);
}
