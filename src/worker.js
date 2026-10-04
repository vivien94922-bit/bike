import { onRequestPost } from '../functions/api/bookings.js';
import { onRequestGet as getReviews, onRequestPost as postReview } from '../functions/api/reviews.js';

const json = (message, status = 405) => new Response(JSON.stringify({ message }), {
  status,
  headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
});

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === '/api/bookings') {
      if (request.method !== 'POST') return json('請使用表單送出租車需求。');
      return onRequestPost({ request, env });
    }
    if (url.pathname === '/api/reviews') {
      if (request.method === 'GET') return getReviews({ request, env });
      if (request.method === 'POST') return postReview({ request, env });
      return json('請使用評論頁送出星等與留言。');
    }
    return env.ASSETS.fetch(request);
  },
};
