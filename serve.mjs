import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = dirname(fileURLToPath(import.meta.url));
const assets = new Map([
  ['/', ['index.html', 'text/html; charset=utf-8']],
  ['/index.html', ['index.html', 'text/html; charset=utf-8']],
  ['/attractions.html', ['public/attractions.html', 'text/html; charset=utf-8']],
  ['/reviews.html', ['public/reviews.html', 'text/html; charset=utf-8']],
  ['/reviews.mjs', ['public/reviews.mjs', 'text/javascript; charset=utf-8']],
  ['/styles.css', ['public/styles.css', 'text/css; charset=utf-8']],
  ['/app.mjs', ['public/app.mjs', 'text/javascript; charset=utf-8']],
  ['/booking.mjs', ['public/booking.mjs', 'text/javascript; charset=utf-8']],
  ['/old-caoling-loop.svg', ['public/old-caoling-loop.svg', 'image/svg+xml; charset=utf-8']],
]);

const server = createServer(async (request, response) => {
  const pathname = new URL(request.url, 'http://localhost').pathname;
  if (pathname === '/api/bookings' && request.method === 'POST') {
    response.writeHead(503, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' });
    response.end(JSON.stringify({ message: '目前是本機展示模式，尚未連接線上寄信服務，因此需求沒有送出。請使用 Cloudflare Pages 正式網址，或致電 02-2499-1585。' }));
    return;
  }
  if (pathname === '/api/reviews') {
    response.writeHead(request.method === 'GET' ? 200 : 503, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' });
    response.end(JSON.stringify(request.method === 'GET' ? { reviews: [] } : { message: '本機展示模式尚未連接 Google 試算表評論服務。' }));
    return;
  }
  const asset = assets.get(pathname) || (/^\/icons\/[a-z-]+\.svg$/.test(pathname) ? [join('public', pathname.slice(1)), 'image/svg+xml; charset=utf-8'] : null);
  if (!asset || request.method !== 'GET') {
    response.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
    response.end('Not found');
    return;
  }
  try {
    const contents = await readFile(join(root, asset[0]));
    response.writeHead(200, { 'content-type': asset[1], 'cache-control': 'no-store' });
    response.end(contents);
  } catch {
    response.writeHead(500, { 'content-type': 'text/plain; charset=utf-8' });
    response.end('Unable to load Demo asset');
  }
});

const port = Number(process.env.PORT || 4173);
server.listen(port, '127.0.0.1', () => {
  console.log(`慢慢騎單車 Demo：http://127.0.0.1:${port}`);
});
