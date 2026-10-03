import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
const routeMap = await readFile(new URL('../public/old-caoling-loop.svg', import.meta.url), 'utf8');
const css = await readFile(new URL('../public/styles.css', import.meta.url), 'utf8');
const app = await readFile(new URL('../public/app.mjs', import.meta.url), 'utf8');

test('首頁具備搜尋摘要、分享 metadata 與公開租車資訊', () => {
  assert.match(html, /<title>歡樂自行車/);
  assert.match(html, /name="description"/);
  assert.match(html, /property="og:title"/);
  for (const sectionId of ['bikes', 'booking', 'how', 'about', 'faq', 'visit']) assert.match(html, new RegExp(`id="${sectionId}"`));
});

test('租車表單涵蓋聯絡、日期、時段、多車款、各車數量和備註', () => {
  for (const field of ['name', 'phone', 'email', 'date', 'time', 'note']) {
    assert.match(html, new RegExp(`name="${field}"`), `表單缺少 ${field}`);
  }
  for (const vehicle of ['standard', 'child', 'tandem', 'electric']) assert.match(html, new RegExp(`data-vehicle="${vehicle}"`));
  assert.match(html, /選擇車種（可複選）/);
  assert.match(html, /id="selected-vehicles"/);
  assert.doesNotMatch(html, /name="pickup"|選擇取車方式/);
  assert.match(html, /送出需求後，店家會再確認車輛與安排/);
  assert.match(html, /預約需求副本寄到你的電子郵件/);
});

test('不向旅客顯示虛構庫存或旅客人數，並註明待確認示意資料', () => {
  assert.doesNotMatch(html, /尚有 [0-9]+ 台|今天有 <strong>[0-9]+ 位旅人|目前為示意/);
  for (const required of ['歡樂自行車', '228 新北市貢寮區', '02-2499-1585', 'NT$ 70', 'NT$ 50', 'NT$ 300', '預約 NT$ 80', '預約 NT$ 120', '預約 NT$ 160', '預約 NT$ 200', '3 小時', 'facebook.com/profile.php?id=100063473843836']) {
    assert.ok(html.includes(required), `首頁缺少店家資料：${required}`);
  }
});

test('首頁新增環狀線景點地圖及八折預約優惠', () => {
  assert.match(html, /route-map/);
  assert.match(html, /線上預約多數車款享 8 折/);
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

test('車款卡可開啟詳細介紹與直接帶入預約，行動版固定訂車入口可見', () => {
  for (const vehicle of ['standard', 'child', 'tandem', 'electric']) {
    assert.match(html, new RegExp(`data-bike-details="${vehicle}"`));
  }
  assert.match(html, /id="bike-detail-modal"/);
  assert.match(html, /選這款並立即訂車/);
  assert.match(html, /class="fixed-booking-cta" href="#booking"/);
  assert.match(css, /\.fixed-booking-cta\{position:fixed/);
});

test('顯示店家及隧道開放時間、徒步規則與取消政策', () => {
  for (const required of ['營業時間 08:30–17:30', '舊草嶺隧道開放時間為早上 08:30 至下午 17:30', '寒暑假及特殊節慶可能異動', '平日可徒步進入', '假日人潮管制時只能騎單車進入', '預約日前一天請來電取消', '列入黑名單', '寄到你的電子郵件']) {
    assert.ok(html.includes(required), `首頁缺少營運資訊：${required}`);
  }
});

test('手機車款以較大文字與單欄卡片呈現', () => {
  assert.match(css, /\.bike-card\{display:block;min-height:0\}/);
  assert.match(css, /\.bike-price-list span\{font-size:13px/);
  assert.match(css, /\.form-privacy\{font-size:12px/);
});

test('預約 API 未啟用時說明原因並提供下一步', () => {
  assert.match(app, /response\.status === 404 \|\| response\.status === 405/);
  assert.match(app, /預約服務尚未部署或目前網址沒有啟用預約 API/);
  assert.match(app, /預約寄信服務尚未完成設定/);
  assert.doesNotMatch(app, /目前無法送出需求，請稍後再試或直接來電/);
});
