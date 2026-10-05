import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
const routeMap = await readFile(new URL('../public/old-caoling-loop.svg', import.meta.url), 'utf8');
const css = await readFile(new URL('../public/styles.css', import.meta.url), 'utf8');
const app = await readFile(new URL('../public/app.mjs', import.meta.url), 'utf8');
const server = await readFile(new URL('../serve.mjs', import.meta.url), 'utf8');
const attractions = await readFile(new URL('../public/attractions.html', import.meta.url), 'utf8').catch(() => '');
const reviews = await readFile(new URL('../public/reviews.html', import.meta.url), 'utf8').catch(() => '');
const reviewApp = await readFile(new URL('../public/reviews.mjs', import.meta.url), 'utf8').catch(() => '');
const astroHome = await readFile(new URL('../src/pages/index.astro', import.meta.url), 'utf8');
const sitemap = await readFile(new URL('../public/sitemap.xml', import.meta.url), 'utf8');
const robots = await readFile(new URL('../public/robots.txt', import.meta.url), 'utf8');
const bikeFleetPhoto = await readFile(new URL('../public/bike-fleet.png', import.meta.url));

test('首頁具備搜尋摘要、分享 metadata 與公開租車資訊', () => {
  assert.match(html, /<title>舊草嶺隧道租車/);
  assert.match(html, /name="description"/);
  assert.match(html, /property="og:title"/);
  for (const sectionId of ['bikes', 'booking', 'how', 'about', 'faq']) assert.match(html, new RegExp(`id="${sectionId}"`));
});

test('SEO 頁面使用在地搜尋詞、唯一 canonical 與可解析的店家結構化資料', () => {
  assert.match(html, /<title>舊草嶺隧道租車・福隆租車｜歡樂自行車<\/title>/);
  assert.match(html, /找福隆租車、福隆火車站附近租車或舊草嶺隧道租車/);
  assert.match(attractions, /福隆火車站租車交通方式/);
  assert.match(reviews, /福隆租車旅人評論/);
  const structuredData = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
  assert.ok(structuredData, '首頁應有 JSON-LD 店家資料');
  const graph = JSON.parse(structuredData[1])['@graph'];
  assert.ok(graph.some((entry) => entry['@type'] === 'BikeStore' && entry.telephone === '+886-2-2499-1585'));
  for (const path of ['/', '/attractions.html', '/reviews.html']) {
    assert.ok(sitemap.includes(`https://bike.vivien94922.workers.dev${path}`), `sitemap 缺少 ${path}`);
  }
  assert.match(robots, /Allow: \/[\s\S]*Sitemap: https:\/\/bike\.vivien94922\.workers\.dev\/sitemap\.xml/);
});

test('Astro 首頁預渲染讀取來源檔，不會依賴尚未產生的 dist/index.html', () => {
  assert.match(astroHome, /import html from '\.\.\/\.\.\/index\.html\?raw'/);
  assert.doesNotMatch(astroHome, /readFile|process\.cwd\(\).*index\.html/);
});

test('租車表單涵蓋聯絡、日期、時段、多車款、各車數量和備註', () => {
  for (const field of ['name', 'phone', 'email', 'plate', 'date', 'time', 'note']) {
    assert.match(html, new RegExp(`name="${field}"`), `表單缺少 ${field}`);
  }
  for (const vehicle of ['standard', 'child', 'tandem', 'electric']) assert.match(html, new RegExp(`data-vehicle="${vehicle}"`));
  assert.match(html, /選擇車種（可複選）/);
  assert.match(html, /id="selected-vehicles"/);
  assert.match(html, /自駕車牌（選填）/);
  assert.match(html, /<select name="time" required><option value="" selected disabled>請選擇時間<\/option><\/select>/);
  assert.match(app, /for \(let minutes = 8 \* 60; minutes <= 17 \* 60; minutes \+= 15\)/);
  assert.doesNotMatch(html, /name="pickup"|選擇取車方式/);
  assert.match(html, /送出需求後，店家會再確認車輛與安排/);
  assert.match(html, /預約資料會存入 Google 試算表/);
});

test('不向旅客顯示虛構庫存或旅客人數，並註明待確認示意資料', () => {
  assert.doesNotMatch(html, /尚有 [0-9]+ 台|今天有 <strong>[0-9]+ 位旅人|目前為示意/);
  for (const required of ['歡樂自行車', '228 新北市貢寮區', '02-2499-1585', '不限時間', 'NT$ 100', 'NT$ 150', 'NT$ 200', 'NT$ 250', 'NT$ 350', '預約 NT$ 80', '預約 NT$ 120', '預約 NT$ 160', '預約 NT$ 200', '預約 NT$ 300', '預約每台折 NT$ 50', 'facebook.com/profile.php?id=100063473843836']) {
    assert.ok(html.includes(required), `首頁缺少店家資料：${required}`);
  }
  assert.doesNotMatch(html, /限時 1\.5 小時 <del>|單次 3 小時。/);
});

test('首頁價格正確，電動車方案以 1.5 小時標示', async () => {
  assert.match(html, /一般單車不限時間 NT\$ 100、預約 NT\$ 80/);
  assert.match(html, /親子車 NT\$ 150、預約 NT\$ 120/);
  assert.match(html, /協力車 NT\$ 200、預約 NT\$ 160/);
  assert.match(html, /電動車 1\.5 小時方案/);
  assert.doesNotMatch(html, /電動車只有 1\.5 小時|電動車僅提供 1\.5 小時/);
  assert.doesNotMatch(html, /3 小時/);
  assert.doesNotMatch((await readFile(new URL('../public/booking.mjs', import.meta.url), 'utf8')), /solo3h|duo3h|3 小時/);
  assert.doesNotMatch(app, /3 小時|solo3h|duo3h/);
});

test('車款區展示店面單車照片，並支援手機版版面和本機預覽', () => {
  assert.match(html, /class="bike-fleet-photo bike-gallery"/);
  assert.match(html, /src="\/bike-fleet\.png" alt="歡樂自行車店前停放多款出租單車/);
  assert.equal(bikeFleetPhoto.subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
  assert.match(css, /\.bike-fleet-photo\{display:grid/);
  assert.match(css, /\.bike-fleet-photo img\{display:block/);
  assert.ok(server.includes("['/bike-fleet.png', ['public/bike-fleet.png', 'image/png']]"));
});

test('單車實照集中於可滑動照片輪播，含車款、觸控滑動與上一張下一張控制', () => {
  assert.match(html, /data-bike-gallery[\s\S]*data-gallery-track/);
  for (const photo of ['bike-fleet.png', 'standard-bike.png', 'family-bike.png', 'tandem-bike.png', 'electric-bike.png']) {
    assert.match(html, new RegExp(`src="\\/${photo}"`));
  }
  assert.match(html, /data-gallery-prev/);
  assert.match(html, /data-gallery-next/);
  assert.match(css, /scroll-snap-type:x mandatory/);
  assert.match(app, /data-bike-gallery/);
  assert.match(css, /touch-action:pan-x/);
  assert.ok(server.includes("['/standard-bike.png', ['public/standard-bike.png', 'image/png']]"));
});

test('電動車卡片展示實車照片並可由本機伺服器載入', () => {
  assert.match(html, /data-bike-card="electric"[\s\S]*?src="\/electric-bike\.png" alt="歡樂自行車店內的電動單車實車"/);
  assert.match(css, /\.bike-card-photo\{position:absolute;inset:0;display:block/);
  assert.ok(server.includes("['/electric-bike.png', ['public/electric-bike.png', 'image/png']]"));
});

test('協力車卡片展示實車照片並可由本機伺服器載入', () => {
  assert.match(html, /data-bike-card="tandem"[\s\S]*?src="\/tandem-bike\.png" alt="歡樂自行車店內的協力車實車"/);
  assert.match(css, /\.bike-card\[data-bike-card="tandem"\]/);
  assert.ok(server.includes("['/tandem-bike.png', ['public/tandem-bike.png', 'image/png']]"));
});

test('親子車卡片展示實車照片並可由本機伺服器載入', () => {
  assert.match(html, /data-bike-card="child"[\s\S]*?src="\/family-bike\.png" alt="歡樂自行車店內的親子車實車"/);
  assert.match(css, /\.bike-card\[data-bike-card="child"\]/);
  assert.ok(server.includes("['/family-bike.png', ['public/family-bike.png', 'image/png']]"));
});

test('一般單車提供兒童尺寸與輔助輪，價格沿用一般單車方案', () => {
  assert.match(html, /一般單車・兒童車/);
  assert.match(html, /提供兒童可騎車款與輔助輪，價格和一般單車相同/);
  assert.match(html, /有兒童單車或輔助輪嗎？/);
  assert.match(html, /各年齡層都歡迎來電詢問適合的車款/);
  assert.match(app, /title: '一般單車・兒童車'.*輔助輪.*價格和一般單車相同/);
});

test('景點指南包含環狀線地圖、飲食休息點與隧道注意事項', () => {
  assert.match(attractions, /old-caoling-loop\.svg/);
  assert.match(attractions, /福隆便當/);
  assert.match(attractions, /隧道裡面涼涼/);
  assert.match(attractions, /九號咖啡石城館/);
  assert.match(attractions, /灆咖啡/);
  assert.match(attractions, /龜山島/);
  assert.match(attractions, /茶裡王/);
  assert.match(attractions, /雨衣/);
  assert.match(attractions, /並排式協力車/);
  assert.match(attractions, /6 月至 9 月/);
  assert.match(attractions, /10 月至隔年 5 月/);
  assert.match(attractions, /necoast-nsa\.gov\.tw/);
  assert.match(attractions, /步行約 30 分鐘/);
  assert.match(attractions, /協助安排停車位/);
  for (const stop of ['福隆火車站', '制天險', '白雲飛處', '石城觀景點', '萊萊地質區', '四角窟觀景台', '三貂角燈塔', '馬崗社區', '卯澳漁村']) {
    assert.ok(routeMap.includes(stop), `路線圖缺少景點：${stop}`);
  }
});

test('評論頁可選星等和送出文字留言，且留言立即公開供旅人參考', () => {
  assert.match(reviews, /旅人評論/);
  assert.match(reviews, /name="rating" value="5"/);
  assert.match(reviews, /textarea name="comment"/);
  assert.match(reviews, /name="consent" type="checkbox" required/);
  assert.match(reviews, /facebook\.com\/profile\.php\?id=100063473843836/);
  assert.match(reviewApp, /fetch\('\/api\/reviews'/);
  assert.match(reviewApp, /textContent = review\.comment/);
  assert.match(reviewApp, /評論已公開/);
  assert.match(reviewApp, /await loadReviews\(\)/);
  assert.match(reviews, /rows="3"/);
});

test('主導覽提供分頁，並在首頁保持立即訂車入口', () => {
  assert.match(html, /href="\/attractions\.html"/);
  assert.match(html, /href="\/reviews\.html"/);
  assert.match(html, /href="#booking"/);
  assert.ok(server.includes("['/attractions.html'"));
  assert.ok(server.includes("['/reviews.html'"));
  assert.ok(server.includes("['/reviews.mjs'"));
  assert.doesNotMatch(html, /route-map-frame|id="route-map"|class="visit-section/);
});

test('內容字級適合長輩閱讀', () => {
  assert.match(css, /--readable-text:18px/);
  assert.match(css, /--readable-small:15px/);
  assert.match(css, /\.booking-form input,\.booking-form select\{font-size:17px/);
  assert.match(css, /@media\(max-width:620px\)\{[\s\S]*?\.booking-form input,\.booking-form select,\.booking-email-label input\{font-size:16px/);
  assert.match(css, /\.guide-card p,\.notice-panel li\{font-size:15px;line-height:1\.8\}/);
});

test('首頁標示店家營業時間，且不顯示使用者要求移除的取消規則', () => {
  assert.match(html, /營業時間 08:30–17:30/);
  assert.doesNotMatch(html, /預約日前一天請來電取消|列入黑名單/);
});

test('首頁常見問題與景點頁都說明騎乘途中故障的道路救援方式', () => {
  assert.match(html, /我們提供道路救援服務。每台車前方都有聯絡電話/);
  assert.match(attractions, /途中故障協助/);
  assert.match(attractions, /每台車前方都有聯絡電話/);
});

test('整體文字比例已放大，手機地圖可橫向檢視', () => {
  assert.match(css, /\.desktop-nav\{[^}]*font-size:14\.4px/);
  assert.match(css, /\.route-map-frame img\{width:860px;max-width:none\}/);
  assert.match(attractions, /手機可左右滑動查看全圖/);
});

test('首頁說明火車與自駕交通方式及現場租車付款流程', () => {
  for (const content of ['調整乘坐舒適度並讓你試騎', '任一張簡單證件暫押', '登記租車開始時間', '依登記時間核算實際騎乘時間', '現場僅收現金付款']) {
    assert.ok(html.includes(content), `首頁缺少租車流程資訊：${content}`);
  }
  assert.doesNotMatch(html, /LINE Pay/);
  assert.match(attractions, /travelmode=walking/);
  assert.match(attractions, /travelmode=driving/);
});

test('預約區提供團體預約的老闆 LINE 加好友連結', () => {
  assert.match(html, /多人團體預約/);
  assert.match(html, /加入老闆 LINE 詢問團體租車/);
  assert.match(html, /https:\/\/line\.me\/R\/ti\/p\/~0912200039/);
});

test('介面圖示改用一致的 SVG，不使用手機 Emoji，且本機伺服器可載入圖示', () => {
  assert.doesNotMatch(html, /[\u{1F300}-\u{1FAFF}]/u);
  assert.doesNotMatch(app, /[\u{1F300}-\u{1FAFF}]/u);
  for (const icon of ['bike', 'id-card', 'return', 'sparkle', 'route', 'heart']) {
    assert.match(html, new RegExp(`/icons/${icon}\\.svg`));
  }
  assert.match(app, /electric-bike\.svg/);
  assert.match(app, /\.bike-detail-icon img'\)\.src = intro\.icon/);
  assert.ok(server.includes("pathname.slice(1)"), '本機伺服器應可安全載入 public/icons 的圖示');
});

test('預約需具備 Google Apps Script 設定，且部署說明涵蓋串接流程', async () => {
  const api = await readFile(new URL('../functions/api/bookings.js', import.meta.url), 'utf8');
  const setup = await readFile(new URL('../docs/GOOGLE_SHEETS_SETUP.md', import.meta.url), 'utf8');
  const script = await readFile(new URL('../google-sheets/Code.gs', import.meta.url), 'utf8');
  assert.match(api, /GOOGLE_SHEETS_WEBHOOK_URL/);
  assert.match(api, /GOOGLE_SHEETS_TOKEN/);
  assert.match(api, /sheetResult\.success !== true/);
  assert.match(api, /status: '待確認'/);
  assert.match(script, /SpreadsheetApp\.openById/);
  assert.match(script, /顧客評論/);
  assert.match(script, /'預約狀態': '待確認'/);
  assert.match(script, /ensureBookingColumns/);
  for (const column of ['預約編號', '姓名', '電話', 'Email', '預約日期', '預約時間', '車種', '數量', '備註', '車牌號碼', '系統建立時間', '預約狀態']) {
    assert.ok(script.includes(column), `Apps Script 缺少試算表欄位：${column}`);
  }
  assert.match(script, /Number\(payload\.rating\), safeCell\(payload\.comment\), '公開'/);
  assert.match(setup, /初始狀態為「待確認」/);
  assert.match(setup, /預約不需要 Resend/);
  assert.match(setup, /只有 Google Apps Script 確認預約已寫入試算表，網站才會顯示送出成功/);
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

test('景點頁顯示季節隧道時間與通行規則，首頁保留店家營業資訊', () => {
  for (const required of ['6 月至 9 月 08:30–17:30', '10 月至隔年 5 月 08:30–17:00', '特殊節慶及臨時公告可能異動', '平日可步行', '只開放自行車通行', '並排式協力車禁止進入隧道']) {
    assert.ok(attractions.includes(required), `景點頁缺少隧道資訊：${required}`);
  }
  for (const required of ['營業時間 08:30–17:30', '存入 Google 試算表']) {
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
  assert.match(app, /Google 試算表連線尚未設定完成/);
  assert.doesNotMatch(app, /目前無法送出需求，請稍後再試或直接來電/);
});

test('手機預約分三步確認，錯誤時保留表單並顯示所選車款金額', () => {
  assert.match(app, /title: '聯絡資料'/);
  assert.match(app, /title: '選車與方案'/);
  assert.match(app, /title: '確認需求'/);
  assert.match(app, /function updateBookingReview\(\)/);
  assert.match(app, /預約需求已存入 Google 試算表/);
  assert.match(app, /form\.querySelector\('\.booking-plate-label'\)/);
  assert.match(css, /\.booking-progress/);
});
