const json = (body, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
});

export async function onRequestGet({ env }) {
  if (!env.GOOGLE_SHEETS_WEBHOOK_URL || !env.GOOGLE_SHEETS_TOKEN) {
    return json({ announcements: [], message: '公告資料服務尚未設定。' }, 503);
  }
  try {
    const endpoint = new URL(env.GOOGLE_SHEETS_WEBHOOK_URL);
    endpoint.searchParams.set('action', 'announcements');
    const response = await fetch(endpoint.toString());
    const result = await response.json().catch(() => ({}));
    if (!response.ok || !Array.isArray(result.announcements)) {
      return json({ announcements: [], message: '公告資料暫時無法讀取。' }, 502);
    }
    return json({ announcements: result.announcements });
  } catch {
    return json({ announcements: [], message: '公告資料暫時無法讀取。' }, 502);
  }
}
