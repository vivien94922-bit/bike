# 歡樂自行車租借網站

手機優先的單車租借資訊網站。一般單車不限時間 NT$100、預約 NT$80；親子車不限時間 NT$150、預約 NT$120；協力車不限時間 NT$200、預約 NT$160。電動車 1.5 小時：單人 NT$250、預約 NT$200；雙人 NT$350、預約 NT$300。首頁提供車款與預約資訊；景點指南和旅人評論分設獨立頁面。景點指南整理福隆便當、舊草嶺隧道、石城咖啡及補給提醒；預約時間可選 08:00 至 17:00，每 15 分鐘一個時段，自駕車牌為必填。店家營業時間 08:30–17:30；隧道開放資訊及變動提醒請見景點頁。送出後，預約資料寫入 Google Sheets，初始狀態為「待確認」，店家再以電話聯絡；本網站不寄送郵件，送出需求不代表預約成立；現場僅收現金付款。

## 本機預覽

需要 Node.js 22.12 或更新版本。網站目前部署在 `bike.vivien94922.workers.dev`（Cloudflare Workers），請用 Wrangler 啟動本機 Worker，這樣 `/api/bookings` 才會和網站使用同一個服務：

```sh
npm install
npm run dev
```

本機與正式 Cloudflare Worker 需設定 Google Apps Script 接收端：

```ini
GOOGLE_SHEETS_WEBHOOK_URL=https://script.google.com/macros/s/.../exec
GOOGLE_SHEETS_TOKEN=與 Apps Script 屬性相同的秘密字串
```

請勿提交 `.dev.vars` 或公開 Google Sheets token。只有 Google Sheets 確認寫入後 API 才會回報成功；若 Sheets 設定或連線失敗，請檢查設定或直接致電店家。

## 測試

```sh
npm test
```

## 建置與部署

`npm run build` 產生網站於 `dist/`；`wrangler.jsonc` 將 `dist/` 設為 Worker 靜態資產，並把 `/api/*` 送至 `src/worker.js`。Worker 會將 `/api/bookings` 交由 `functions/api/bookings.js` 驗證並寫入 Google Sheets。設定 Cloudflare Wrangler 登入與 Sheets 環境變數後執行 `npm run deploy`，即可部署到 Worker `bike`。上線前請以測試預約確認試算表新增資料和初始狀態。
