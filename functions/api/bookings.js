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

  const shopEmail = env.BOOKING_TO_EMAIL || 'vivien94922@gmail.com';
  if (!env.RESEND_API_KEY || !env.BOOKING_FROM_EMAIL) {
    return json({ message: '預約郵件服務尚未設定完成，需求沒有送出。請直接致電 02-2499-1585；店家完成郵件設定後即可線上預約。' }, 503);
  }
  if (!env.GOOGLE_SHEETS_WEBHOOK_URL || !env.GOOGLE_SHEETS_TOKEN) {
    return json({ message: 'Google 試算表尚未完成連線設定，需求沒有送出。請致電 02-2499-1585。' }, 503);
  }

  const requestId = `SR-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
  const text = [
    `租車需求編號：${requestId}`,
    `稱呼：${booking.name.trim()}`,
    `聯絡電話：${booking.phone.trim()}`,
    `顧客電子郵件：${booking.email.trim()}`,
    `自駕車牌：${booking.plate?.trim() || '（未提供）'}`,
    `取車日期：${booking.date}`,
    `取車時段：${booking.time}`,
    '車款與租借時限：',
    ...booking.vehicles.map(({ vehicleId, packageId, quantity }) =>
      `- ${VEHICLES[vehicleId].name}・${VEHICLES[vehicleId].packages[packageId].label} × ${quantity} 台（預約優惠單價 NT$ ${getBookingPrice(vehicleId, packageId).toLocaleString('zh-TW')}）`),
    `預估租金（全車種）：NT$ ${estimateRentals(booking.vehicles).toLocaleString('zh-TW')}`,
    `備註：${(booking.note || '').trim() || '（無）'}`,
    '',
    '此需求尚未成立預約，請聯絡客人確認車輛與時段。',
    '如需取消，請於預約日前一天來電告知；未依規定取消者將列入店家黑名單。',
  ].join('\n');

  const customerText = [
    `親愛的 ${booking.name.trim()} 您好：`,
    '',
    `我們已收到您的歡樂自行車租車需求（編號：${requestId}）。`,
    `預計日期與時間：${booking.date} ${booking.time}`,
    `自駕車牌：${booking.plate?.trim() || '（未提供）'}`,
    '車款與租借時限：',
    ...booking.vehicles.map(({ vehicleId, packageId, quantity }) =>
      `- ${VEHICLES[vehicleId].name}・${VEHICLES[vehicleId].packages[packageId].label} × ${quantity} 台（預約優惠單價 NT$ ${getBookingPrice(vehicleId, packageId).toLocaleString('zh-TW')}）`),
    `預估租金：NT$ ${estimateRentals(booking.vehicles).toLocaleString('zh-TW')}`,
    '',
    '這封信只代表我們收到需求，尚不代表預約成立。店家會再以電話和您確認車輛與時段。',
    '如需取消，請於預約日前一天來電告知；未依規定取消者將列入店家黑名單。',
    '歡樂自行車｜02-2499-1585｜每日 08:30–17:30',
  ].join('\n');

  try {
    const sendEmail = (to, subject, body) => fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        authorization: `Bearer ${env.RESEND_API_KEY}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({ from: env.BOOKING_FROM_EMAIL, to: [to], subject, text: body }),
    });
    const [ownerResponse, customerResponse] = await Promise.all([
      sendEmail(shopEmail, `單車租借需求｜${requestId}`, text),
      sendEmail(booking.email.trim(), `已收到您的租車需求｜${requestId}`, customerText),
    ]);
    if (!ownerResponse.ok || !customerResponse.ok) return json({ message: '預約通知或顧客確認信寄送失敗，系統未回報預約成功。請來電 02-2499-1585 確認需求狀態。' }, 502);
  } catch {
    return json({ message: '預約郵件暫時無法寄送，系統未回報預約成功。請來電 02-2499-1585 確認需求狀態。' }, 502);
  }

  const sheetPayload = {
    token: env.GOOGLE_SHEETS_TOKEN,
    requestId,
    name: booking.name.trim(),
    phone: booking.phone.trim(),
    email: booking.email.trim(),
    plate: booking.plate?.trim() || '',
    date: booking.date,
    time: booking.time,
    vehicles: booking.vehicles.map(({ vehicleId, packageId, quantity }) => ({
      name: VEHICLES[vehicleId].name,
      package: VEHICLES[vehicleId].packages[packageId].label,
      quantity: Number(quantity),
      unitPrice: getBookingPrice(vehicleId, packageId),
    })),
    estimatedTotal: estimateRentals(booking.vehicles),
    note: (booking.note || '').trim(),
  };
  try {
    const sheetResponse = await fetch(env.GOOGLE_SHEETS_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(sheetPayload),
    });
    const sheetResult = await sheetResponse.json().catch(() => ({}));
    if (!sheetResponse.ok || sheetResult.success !== true) {
      return json({ message: `郵件已寄出，但 Google 試算表未確認寫入（需求編號 ${requestId}）。請不要重複送出，請致電 02-2499-1585 確認。` }, 502);
    }
  } catch {
    return json({ message: `郵件已寄出，但 Google 試算表連線失敗（需求編號 ${requestId}）。請不要重複送出，請致電 02-2499-1585 確認。` }, 502);
  }

  return json({ requestId }, 201);
}
