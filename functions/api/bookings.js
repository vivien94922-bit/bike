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
  if (contentLength > 12_000) return json({ message: '表單內容過長，請縮短備註後重試。' }, 413);

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

  if (!env.RESEND_API_KEY || !env.BOOKING_TO_EMAIL || !env.BOOKING_FROM_EMAIL) {
    return json({ message: '店家通知尚未完成設定，需求沒有送出。請直接致電店家洽詢。' }, 503);
  }

  const requestId = `SR-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
  const text = [
    `租車需求編號：${requestId}`,
    `稱呼：${booking.name.trim()}`,
    `聯絡電話：${booking.phone.trim()}`,
    `取車日期：${booking.date}`,
    `取車時段：${booking.time}`,
    '車款與租借時限：',
    ...booking.vehicles.map(({ vehicleId, packageId, quantity }) =>
      `- ${VEHICLES[vehicleId].name}・${VEHICLES[vehicleId].packages[packageId].label} × ${quantity} 台（預約 8 折單價 NT$ ${getBookingPrice(vehicleId, packageId).toLocaleString('zh-TW')}）`),
    `預估租金（全車種）：NT$ ${estimateRentals(booking.vehicles).toLocaleString('zh-TW')}`,
    `備註：${(booking.note || '').trim() || '（無）'}`,
    '',
    '此需求尚未成立預約，請聯絡客人確認車輛與時段。',
  ].join('\n');

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        authorization: `Bearer ${env.RESEND_API_KEY}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        from: env.BOOKING_FROM_EMAIL,
        to: [env.BOOKING_TO_EMAIL],
        subject: `單車租借需求｜${requestId}`,
        text,
      }),
    });
    if (!response.ok) return json({ message: '暫時無法通知店家，需求沒有送出。請稍後重試或直接來電。' }, 502);
  } catch {
    return json({ message: '暫時無法通知店家，需求沒有送出。請稍後重試或直接來電。' }, 502);
  }

  return json({ requestId }, 201);
}
