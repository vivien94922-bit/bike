import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { onRequestGet } from '../functions/api/announcements.js';
import worker from '../src/worker.js';

const read = (path) => readFile(new URL(path, import.meta.url), 'utf8');

test('公告獨立頁和各頁頂端優惠提示存在，預約及評論表單連結維持原樣', async () => {
  const [home, attractions, reviews, announcements, about] = await Promise.all([
    read('../index.html'), read('../public/attractions.html'), read('../public/reviews.html'), read('../public/announcements.html'), read('../public/about.html'),
  ]);
  const promo = '預約享八折優惠（限租車之前），不限使用次數';
  for (const page of [home, attractions, reviews, announcements, about]) {
    assert.ok(page.includes(promo));
    assert.match(page, /href="\/announcements\.html"/);
    assert.match(page, /href="\/about\.html"/);
  }
  assert.match(about, /創立於 2005 年/);
  assert.match(about, /自家老宅/);
  assert.match(home, /1FAIpQLSf7jsBPqwPe_aopFh-yZ18f9J11lUtYIPi3rsmZfiHqRZQ1UQ/);
  assert.match(reviews, /1FAIpQLScJ47EZxyWhMLXGmw4cjdNPDkLbiEnoTClu0XFsbG8v7gYnEg/);
  assert.match(announcements, /id="announcement-list"/);
});

test('評論列表與留言表單共用相同寬度、卡片內距和上下間距', async () => {
  const [page, styles] = await Promise.all([read('../public/reviews.html'), read('../public/styles.css')]);
  assert.match(page, /\.reviews-page > \.review-note,[\s\S]*?\.reviews-page > \.review-form-card,[\s\S]*?\.reviews-page > \.review-contact/);
  assert.match(page, /width:\s*100%;[\s\S]*?max-width:\s*none;[\s\S]*?margin:\s*0 0 22px;[\s\S]*?padding:\s*38px;/);
  assert.match(page, /google-review-embed iframe[\s\S]*?width:\s*100%/);
  assert.match(styles, /\.announcements-page\{max-width:1120px/);
});

test('Apps Script 公告讀取使用指定試算表的「公告」分頁與公開狀態', async () => {
  const script = await read('../google-sheets/Code.gs');
  assert.match(script, /ANNOUNCEMENTS_SPREADSHEET_ID = '1DjWHXiweBQzOwWtLERMF7w3l-GZ-xdoFdc_0phqLAqA'/);
  assert.match(script, /getSheetByName\('公告'\)/);
  assert.match(script, /row\[3\]\.trim\(\) === '公開'/);
});

test('公告 API 設定缺漏時不呼叫 Apps Script', async () => {
  const response = await onRequestGet({ env: {} });
  assert.equal(response.status, 503);
  assert.deepEqual(await response.json(), { announcements: [], message: '公告資料服務尚未設定。' });
});

test('公告 API 轉送 Apps Script 清單，Worker 僅將 GET 路由至此功能', async (t) => {
  const originalFetch = globalThis.fetch;
  let target;
  globalThis.fetch = async (url) => {
    target = new URL(url);
    return Response.json({ announcements: [{ date: '2026-10-20', title: '店休公告', content: '休息一天' }] });
  };
  t.after(() => { globalThis.fetch = originalFetch; });

  const env = { GOOGLE_SHEETS_WEBHOOK_URL: 'https://script.google.com/macros/s/example/exec', GOOGLE_SHEETS_TOKEN: 'test-token' };
  const response = await worker.fetch(new Request('https://bike.example.test/api/announcements'), { ...env, ASSETS: { fetch: async () => new Response('asset') } });
  assert.equal(response.status, 200);
  assert.equal(target.searchParams.get('action'), 'announcements');
  assert.deepEqual(await response.json(), { announcements: [{ date: '2026-10-20', title: '店休公告', content: '休息一天' }] });

  const postResponse = await worker.fetch(new Request('https://bike.example.test/api/announcements', { method: 'POST' }), { ASSETS: { fetch: async () => new Response('asset') } });
  assert.equal(postResponse.status, 405);
});
