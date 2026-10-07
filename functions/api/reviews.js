export async function onRequestGet(context) {
  const { env } = context;

  if (!env.GOOGLE_SHEETS_WEBHOOK_URL) {
    return json({
      reviews: [],
      error: 'GOOGLE_SHEETS_WEBHOOK_URL 尚未設定'
    });
  }

  try {
    const endpoint = new URL(
      env.GOOGLE_SHEETS_WEBHOOK_URL
    );

    endpoint.searchParams.set(
      'action',
      'reviews'
    );

    const response = await fetch(
      endpoint.toString(),
      {
        method: 'GET',
        redirect: 'follow',
        headers: {
          'Accept': 'application/json'
        }
      }
    );

    const text = await response.text();

    console.log(
      'Google Apps Script 回傳：',
      text
    );

    if (!response.ok) {
      return json({
        reviews: [],
        error:
          `Google Apps Script HTTP ${response.status}`,
        googleResponse: text
      });
    }

    let result;

    try {
      result = JSON.parse(text);
    } catch {
      return json({
        reviews: [],
        error:
          'Google Apps Script 回傳的不是 JSON',
        googleResponse: text
      });
    }

    if (!Array.isArray(result.reviews)) {
      return json({
        reviews: [],
        error:
          'Google Apps Script 沒有回傳 reviews 陣列',
        googleResponse: result
      });
    }

    const reviews = result.reviews.map((review) => {
  const rawRating = String(review.rating || '').trim();

  let rating = Number(rawRating);

  // 如果 Google Sheets 回傳的是 ★★★★★
  if (!Number.isFinite(rating)) {
    rating = (rawRating.match(/[★⭐]/g) || []).length;
  }

  // 限制在 1～5 顆星
  rating = Math.min(5, Math.max(1, rating || 1));

  return {
    name: review.name || '匿名旅人',
    rating,
    comment: review.comment || '',
    date: review.date || ''
  };
});

return json({
  reviews
});

  } catch (error) {

    console.error(
      '取得評論失敗：',
      error
    );

    return json({
      reviews: [],
      error:
        error?.message ||
        '取得評論失敗'
    });
  }
}


// ======================================
// 保留原本的 POST 功能
// ======================================
export async function onRequestPost(context) {
  const { request, env } = context;

  if (!env.GOOGLE_SHEETS_WEBHOOK_URL) {
    return json({
      success: false,
      message:
        'GOOGLE_SHEETS_WEBHOOK_URL 尚未設定'
    });
  }

  try {

    const body =
      await request.text();

    const endpoint = new URL(
      env.GOOGLE_SHEETS_WEBHOOK_URL
    );

    endpoint.searchParams.set(
      'action',
      'review'
    );

    const response = await fetch(
      endpoint.toString(),
      {
        method: 'POST',
        headers: {
          'Content-Type':
            'application/json'
        },
        body
      }
    );

    const text =
      await response.text();

    let result;

    try {
      result = JSON.parse(text);
    } catch {
      result = {
        success: response.ok,
        message: text
      };
    }

    return json(result);

  } catch (error) {

    console.error(
      '送出評論失敗：',
      error
    );

    return json({
      success: false,
      message:
        error?.message ||
        '送出評論失敗'
    });
  }
}


function json(data) {
  return new Response(
    JSON.stringify(data),
    {
      status: 200,
      headers: {
        'Content-Type':
          'application/json; charset=utf-8',

        'Cache-Control':
          'no-store, no-cache, must-revalidate'
      }
    }
  );
}
