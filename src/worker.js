
import { onRequestPost } from '../functions/api/bookings.js';

import {
  onRequestGet as getReviews,
  onRequestPost as postReview
} from '../functions/api/reviews.js';

import {
  onRequestGet as getAnnouncements
} from '../functions/api/announcements.js';

const json = (message, status = 405) =>
  new Response(JSON.stringify({ message }), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
    },
  });

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // 租車預約：保留原本功能
    if (url.pathname === '/api/bookings') {
      if (request.method !== 'POST') {
        return json('請使用表單送出租車需求。');
      }

      return onRequestPost({ request, env });
    }

    // 顧客評論：保留原本功能
    if (url.pathname === '/api/reviews') {
      if (request.method === 'GET') {
        return getReviews({ request, env });
      }

      if (request.method === 'POST') {
        return postReview({ request, env });
      }

      return json('請使用評論頁送出星等與留言。');
    }

    // 公告：新增這條路由
    if (url.pathname === '/api/announcements') {
      if (request.method !== 'GET') {
        return json('公告 API 僅支援 GET。');
      }

      return getAnnouncements({ request, env });
    }

    // 其他網址維持原本的靜態網站處理方式
    return env.ASSETS.fetch(request);
  },
};
