# 預約通知與 Google 試算表設定

線上表單會寄出店家與顧客郵件，再將同一筆需求寫入 Google 試算表；成功畫面只會在三項操作均確認後顯示。若郵件寄出但試算表未確認，頁面會顯示需求編號並提醒不要重複提交。

旅人評論也會存進同一份試算表的「顧客評論」工作表。新評論預設為「待審核」，店家把該列狀態改成「公開」後才會出現在評論頁；公開 API 只回傳暱稱、星等、留言與日期，不會讀取預約資料或待審核留言。

## 1. 建立試算表接收端

1. 在 Google 試算表建立一份專用預約表，打開「擴充功能 → Apps Script」。
2. 將 `google-sheets/Code.gs` 全文貼到 Apps Script 的 `Code.gs` 並儲存。
3. 在 Apps Script「專案設定 → 指令碼屬性」新增：
   - `SPREADSHEET_ID`：試算表網址中 `/d/` 與下一個 `/` 之間的 ID。
   - `BOOKING_SHEETS_TOKEN`：自行產生一組長且隨機的秘密字串。
4. 選「部署 → 新增部署 → 網頁應用程式」，執行身分選「我」，存取權選「所有人」，授權存取試算表並完成部署。
5. 複製部署提供的 `https://script.google.com/macros/s/.../exec` 網址。程式會驗證秘密 token；不要把 token 放在網頁前端或公開文件。

若更新 Apps Script 程式碼，請在「部署 → 管理部署」編輯部署並選擇新版本，否則線上端仍會執行舊版本。評論功能加入後，必須更新網頁應用程式部署版本，讓 `/exec?action=reviews` 和評論寫入分流生效。

## 2. 設定 Cloudflare Worker

到 Cloudflare Dashboard → Workers & Pages → `bike` → Settings → Variables and Secrets，設定：

| 名稱 | 類型 | 值 |
| --- | --- | --- |
| `RESEND_API_KEY` | Secret | Resend API key |
| `BOOKING_FROM_EMAIL` | Variable | Resend 已驗證網域中的寄件地址，例如 `歡樂自行車 <booking@你的已驗證網域>` |
| `BOOKING_TO_EMAIL` | Variable（選填） | 收件信箱；未設定時預設為 `vivien94922@gmail.com` |
| `GOOGLE_SHEETS_WEBHOOK_URL` | Variable | 上一步取得的 Apps Script 網頁應用程式網址 |
| `GOOGLE_SHEETS_TOKEN` | Secret | 與 Apps Script 的 `BOOKING_SHEETS_TOKEN` 完全相同 |

Resend 必須先驗證寄件網域並完成 DNS 設定。不要將 API key 或 token 寫進原始碼、前端或一般變數。

## 3. 部署與驗證

在 Cloudflare 對 Worker 部署包含最新 `functions/api/bookings.js`、`src/worker.js` 及 `dist` 靜態資產的版本。使用正式網站送出一筆自己可辨認的測試需求，確認：

- Worker 回傳成功且頁面顯示需求編號。
- `vivien94922@gmail.com` 收到店家通知；填入的顧客信箱收到確認信。
- Google 試算表新增相同需求編號、車款、數量與預估金額。
- 測試送出一則評論後，「顧客評論」分頁新增「待審核」列；把狀態改為「公開」後重新載入評論頁，確認星等和留言出現。

目前此工作階段未登入 Cloudflare，也沒有 Resend 或 Google 的憑證，因此尚未替帳號設定或部署。登入 Dashboard 後還需新增上述變數並部署；Google Apps Script 也需由有權限的 Google 帳號建立與授權。
