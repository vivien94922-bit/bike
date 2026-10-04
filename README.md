# 歡樂自行車租借網站

手機優先的單車租借資訊網站。一般單車不限時間 NT$100、預約 NT$80；親子車不限時間 NT$150、預約 NT$120；協力車不限時間 NT$200、預約 NT$160。電動車 1.5 小時單人 NT$250、雙人 NT$350；3 小時單人 NT$350、雙人 NT$450，預約每台折 NT$50（預約價依序 NT$200、NT$300、NT$300、NT$400）。旅客可瀏覽舊草嶺環狀線景點地圖並送出租車需求；預約時間可選 08:00 至 17:00，每 15 分鐘一個時段，自駕車牌為選填。店家營業時間 08:30–17:30；隧道開放資訊及變動提醒請見首頁。成功送出後，需求寄到店家與顧客信箱，店家再以電話人工確認；送出需求不代表預約成立，也不會線上付款。

## 本機預覽

需要 Node.js 22.12 或更新版本。網站目前部署在 `bike.vivien94922.workers.dev`（Cloudflare Workers），請用 Wrangler 啟動本機 Worker，這樣 `/api/bookings` 才會和網站使用同一個服務：

```sh
npm install
npm run dev
```

`.dev.vars` 範例如下：

```ini
RESEND_API_KEY=re_...
BOOKING_TO_EMAIL=vivien94922@gmail.com
BOOKING_FROM_EMAIL=已驗證網域的寄件人 <bookings@example.com>
```

請勿提交 `.dev.vars` 或公開郵件服務金鑰。成功送出預約需求後會分別寄到店家（預設 vivien94922@gmail.com）及顧客填寫的電子郵件，不寫入資料庫。正式 Cloudflare Worker 需設定同名環境變數，且寄件網域需先在 Resend 驗證。若本機未設定 `.dev.vars`，API 會回報郵件服務尚未設定，不會假裝成功。

## 測試

```sh
npm test
```

## 建置與部署

`npm run build` 產生網站於 `dist/`；`wrangler.jsonc` 將 `dist/` 設為 Worker 靜態資產，並把 `/api/*` 送至 `src/worker.js`。Worker 會將 `/api/bookings` 交由 `functions/api/bookings.js` 驗證並寄送通知。設定 Cloudflare Wrangler 登入及 Resend 環境變數後執行 `npm run deploy`，即可部署到 Worker `bike`。上線前請以實際收件信箱驗證通知流程。
