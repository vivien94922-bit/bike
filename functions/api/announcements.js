const json = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
    },
  });

export async function onRequestGet({ env }) {
  // 確認必要設定存在
  if (
    !env.ANNOUNCEMENTS_WEBHOOK_URL
  ) {
    return json(
      {
        announcements: [],
        message: '公告資料服務尚未設定。',
      },
      503
    );
  }

  try {
    // 連接 Google Apps Script
    const endpoint = new URL(
      env.ANNOUNCEMENTS_WEBHOOK_URL
    );

    endpoint.searchParams.set(
      'action',
      'announcements'
    );

    const response = await fetch(endpoint.toString());

    const result = await response.json().catch(() => ({}));

    if (
      !response.ok ||
      !Array.isArray(result.announcements)
    ) {
      return json(
        {
          announcements: [],
          message: '公告資料暫時無法讀取。',
        },
        502
      );
    }

    // Google Apps Script 已負責依日期由新到舊排序
    return json({
      announcements: result.announcements,
    });
  } catch (error) {
    return json(
      {
        announcements: [],
        message: '公告資料暫時無法讀取。',
      },
      502
    );
  }
}
