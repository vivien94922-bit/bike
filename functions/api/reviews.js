const json = (body, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
});

export async function onRequestGet({ env }) {
  if (!env.GOOGLE_SHEETS_WEBHOOK_URL) {
  return json({ reviews: [] });
}
  try {
    const endpoint = new URL(env.GOOGLE_SHEETS_WEBHOOK_URL);
    endpoint.searchParams.set('action', 'reviews');
    const response = await fetch(endpoint.toString());
    const result = await response.json().catch(() => ({}));
    if (!response.ok || !Array.isArray(result.reviews)) return json({ reviews: [] });
    return json({ reviews: result.reviews });
  } catch {
    return json({ reviews: [] });
  }
}

export async function onRequestPost({ request, env }) {
  if (!request.headers.get('content-type')?.toLowerCase().includes('application/json')) {
    return json({ message: '請使用有效的留言格式重新送出。' }, 415);
  }
  const contentLength = Number(request.headers.get('content-length') || 0);
  if (contentLength > 4_000) return json({ message: '留言太長，請縮短後再送出。' }, 413);

  let review;
  try {
    review = await request.json();
  } catch {
    return json({ message: '留言格式錯誤，請重新輸入。' }, 400);
  }
  if (!review || typeof review !== 'object' || Array.isArray(review)) {
    return json({ message: '留言格式錯誤，請重新輸入。' }, 400);
  }
  if (review.website) return json({ received: true }, 202);

  const name = typeof review.name === 'string' ? review.name.trim() : '';
  const comment = typeof review.comment === 'string' ? review.comment.trim() : '';
  const rating = Number(review.rating);
  if (name.length > 40) return json({ message: '稱呼請控制在 40 字以內。' }, 400);
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) return json({ message: '請選擇 1 至 5 顆星。' }, 400);
  if (comment.length < 5 || comment.length > 1_000) return json({ message: '留言請填寫 5 至 1000 個字。' }, 400);
  if (review.consent !== true) return json({ message: '請先確認留言會公開顯示。' }, 400);
  const missingSettings = ['GOOGLE_SHEETS_WEBHOOK_URL', 'GOOGLE_SHEETS_TOKEN'].filter((key) => !env[key]);
  if (missingSettings.length) {
    return json({ message: `留言服務尚未連線，留言沒有送出。Cloudflare Worker Production 缺少：${missingSettings.join('、')}。請完成設定並部署後再試。` }, 503);
  }

  const reviewId = `RV-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
  try {
    const response = await fetch(env.GOOGLE_SHEETS_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        token: env.GOOGLE_SHEETS_TOKEN,
        type: 'review', reviewId, name: name || '匿名旅人', rating, comment,
      }),
    });
    const result = await response?.json().catch(() => ({}));
    if (!response?.ok || result?.success !== true) {
      return json({ message: '留言目前沒有成功送出，請稍後重試或改到 Facebook 留言。' }, 502);
    }
    return json({ reviewId, status: 'published' }, 201);
  } catch {
    return json({ message: '留言目前無法連線送出，請稍後重試或改到 Facebook 留言。' }, 502);
  }
}
