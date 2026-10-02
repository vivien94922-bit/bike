# 歡樂自行車租借網站

手機優先的單車租借資訊網站。旅客可查看一般單車、親子車、協力車及電動車的租金方案，瀏覽舊草嶺環狀線景點地圖，並送出租車需求。網站預約享租金八折；店家收到郵件後以電話人工確認。送出需求不代表預約成立，也不會線上付款。營業時間請來電確認。

## 本機預覽

需要 Node.js 22.12 或更新版本。安裝相依套件後以 Astro 預覽靜態網站：

```sh
npm install
npm run dev
```

正式預覽表單 API 時，設定 `.dev.vars` 後執行 `npm run pages:dev`，並在 Wrangler 顯示的本機網址開啟網站。`.dev.vars` 範例如下：

```ini
RESEND_API_KEY=re_...
BOOKING_TO_EMAIL=店家收件信箱
BOOKING_FROM_EMAIL=已驗證網域的寄件人 <bookings@example.com>
```

請勿提交 `.dev.vars` 或公開郵件服務金鑰。正式 Cloudflare Pages 專案需設定同名環境變數；寄件網域需先在 Resend 驗證。送出需求會寄到店家信箱，不寫入資料庫。

## 測試

```sh
npm test
```

## 建置與部署

`npm run build` 產生靜態網站於 `dist/`，部署至 Cloudflare Pages，建置指令為 `npm run build`、輸出目錄為 `dist`。Cloudflare Pages Functions 由 `functions/api/bookings.js` 處理 `/api/bookings`。上線前請補上正式品牌與營運資料、網站網域及個資告知內容，並以實際收件信箱驗證通知流程。
