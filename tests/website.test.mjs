import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
const routeMap = await readFile(new URL('../public/old-caoling-loop.svg', import.meta.url), 'utf8');
const css = await readFile(new URL('../public/styles.css', import.meta.url), 'utf8');

test('首頁具備搜尋摘要、分享 metadata 與公開租車資訊', () => {
  assert.match(html, /<title>歡樂自行車/);
  assert.match(html, /name="description"/);
  assert.match(html, /property="og:title"/);
  for (const sectionId of ['bikes', 'booking', 'how', 'about', 'faq', 'visit']) assert.match(html, new RegExp(`id="${sectionId}"`));
});

test('租車表單涵蓋聯絡、日期、時段、多車款、各車數量和備註', () => {
  for (const field of ['name', 'phone', 'date', 'time', 'note']) {
    assert.match(html, new RegExp(`name="${field}"`), `表單缺少 ${field}`);
  }
  for (const vehicle of ['standard', 'child', 'tandem', 'electric']) assert.match(html, new RegExp(`data-vehicle="${vehicle}"`));
  assert.match(html, /選擇車種（可複選）/);
  assert.match(html, /id="selected-vehicles"/);
  assert.doesNotMatch(html, /name="pickup"|選擇取車方式/);
  assert.match(html, /送出需求後，店家會再確認車輛與安排/);
  assert.match(html, /網站不會收取費用/);
});

test('不向旅客顯示虛構庫存或旅客人數，並註明待確認示意資料', () => {
  assert.doesNotMatch(html, /尚有 [0-9]+ 台|今天有 <strong>[0-9]+ 位旅人|目前為示意/);
  for (const required of ['歡樂自行車', '228 新北市貢寮區', '02-2499-1585', 'NT$ 70', '預約 NT$ 56', '預約 NT$ 80', '預約 NT$ 120', '預約 NT$ 160', '預約 NT$ 200', '預約 NT$ 280', '3 小時', 'facebook.com/profile.php?id=100063473843836']) {
    assert.ok(html.includes(required), `首頁缺少店家資料：${required}`);
  }
});

test('首頁新增環狀線景點地圖及八折預約優惠', () => {
  assert.match(html, /route-map/);
  assert.match(html, /預約享租金 8 折/);
  assert.match(html, /舊草嶺環狀線/);
  for (const stop of ['福隆火車站', '制天險', '白雲飛處', '石城觀景點', '萊萊地質區', '四角窟觀景台', '三貂角燈塔', '馬崗社區', '卯澳漁村']) {
    assert.ok(routeMap.includes(stop), `路線圖缺少景點：${stop}`);
  }
  assert.match(routeMap, /不按比例繪製/);
  assert.match(routeMap, /#ec6e83/);
  assert.match(routeMap, /柔和的海岸、山丘與手繪海浪/);
});

test('整體文字比例已放大，手機地圖可橫向檢視', () => {
  assert.match(css, /\.desktop-nav\{[^}]*font-size:14\.4px/);
  assert.match(css, /\.route-map-frame img\{width:860px;max-width:none\}/);
  assert.match(html, /手機可左右滑動看全圖/);
});

test('首頁說明火車與自駕交通方式及現場租車付款流程', () => {
  for (const content of ['福隆火車站', '步行約 30 分鐘', '遮陽的大樹', '協助安排停車位', '調整乘坐舒適度並讓你試騎', '任一張簡單證件暫押', '登記租車開始時間', '依登記時間核算實際騎乘時間', '現金或 LINE Pay']) {
    assert.ok(html.includes(content), `首頁缺少交通或租車流程資訊：${content}`);
  }
  assert.match(html, /travelmode=walking/);
  assert.match(html, /travelmode=driving/);
});

test('預約區提供團體預約的老闆 LINE 加好友連結', () => {
  assert.match(html, /多人團體預約/);
  assert.match(html, /加入老闆 LINE 詢問團體租車/);
  assert.match(html, /https:\/\/line\.me\/R\/ti\/p\/~0912200039/);
});
