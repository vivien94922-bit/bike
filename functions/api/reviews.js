export async function onRequestGet(context) {
  const { env } = context;

  // 檢查 Apps Script 網址是否存在
  if (!env.GOOGLE_SHEETS_WEBHOOK_URL) {
    return json({
      reviews: [],
      error: 'GOOGLE_SHEETS_WEBHOOK_URL 尚未設定'
    });
  }

  try {
    // 建立 Apps Script 網址
    const endpoint = new URL(
      env.GOOGLE_SHEETS_WEBHOOK_URL
    );

    // 告訴 Apps Script：我要取得評論
    endpoint.searchParams.set(
      'action',
      'reviews'
    );

    // 呼叫 Google Apps Script
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

    // 讀取 Google 回傳內容
    const text = await response.text();

    console.log(
      'Google Apps Script 回傳：',
      text
    );

    // 如果 Google 回傳錯誤
    if (!response.ok) {
      return json({
        reviews: [],
        error: `Google Apps Script HTTP ${response.status}`,
        googleResponse: text
      });
    }

    // 將文字轉成 JSON
    let result;

    try {
      result = JSON.parse(text);
    } catch (error) {
      return json({
        reviews: [],
        error: 'Google Apps Script 回傳的不是 JSON',
        googleResponse: text
      });
    }

    // 確認 reviews 是陣列
    if (!Array.isArray(result.reviews)) {
      return json({
        reviews: [],
        error: 'Google Apps Script 沒有回傳 reviews 陣列',
        googleResponse: result
      });
    }

    // 成功
    return json({
      reviews: result.reviews
    });

  } catch (error) {

    console.error(
      '取得評論失敗：',
      error
    );

    return json({
      reviews: [],
      error: error?.message || '取得評論失敗'
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
