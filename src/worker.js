import { onRequestPost } from '../functions/api/bookings.js';

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
    return env.ASSETS.fetch(request);
  },
};
