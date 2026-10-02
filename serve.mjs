import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = dirname(fileURLToPath(import.meta.url));
const assets = new Map([
  ['/', ['index.html', 'text/html; charset=utf-8']],
  ['/index.html', ['index.html', 'text/html; charset=utf-8']],
  ['/styles.css', ['styles.css', 'text/css; charset=utf-8']],
  ['/app.mjs', ['app.mjs', 'text/javascript; charset=utf-8']],
  ['/booking.mjs', ['booking.mjs', 'text/javascript; charset=utf-8']],
]);

const server = createServer(async (request, response) => {
  const pathname = new URL(request.url, 'http://localhost').pathname;
  const asset = assets.get(pathname);
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
