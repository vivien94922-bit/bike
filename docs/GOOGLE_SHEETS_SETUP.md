# Google 試算表預約與評論設定

線上預約以 Google Sheets 作為唯一收件與保存管道，不寄送郵件。只有 Google Apps Script 確認預約已寫入試算表，網站才會顯示送出成功；新增預約的初始狀態為「待確認」。店家可在試算表更新為「已確認」或「已取消」。

預約表單只收集電話、取車日期與時間、自駕車牌（必填）及所選車款／數量。寫入資料包含預約編號、電話、預約日期、預約時間、車種、數量、車牌號碼、系統建立時間、預約狀態及預估金額。沿用舊工作表時，姓名、Email、備註等舊欄位會保留但留白，Apps Script 不會刪除既有欄位。

旅人評論也會存進同一份試算表的「顧客評論」工作表。送出後評論立即公開，讓其他訪客可以參考；公開 API 只回傳暱稱、星等、留言與日期，不會讀取預約資料。顧客送出前會看到公開告知並需勾選同意，暱稱可留空。

## 1. 建立試算表接收端

1. 在 Google 試算表建立一份專用預約表，打開「擴充功能 → Apps Script」。
2. 將 `google-sheets/Code.gs` 全文貼到 Apps Script 的 `Code.gs` 並儲存。
3. 在 Apps Script「專案設定 → 指令碼屬性」新增：
   - `SPREADSHEET_ID`：試算表網址中 `/d/` 與下一個 `/` 之間的 ID。
   - `BOOKING_SHEETS_TOKEN`：自行產生一組長且隨機的秘密字串。
4. 選「部署 → 新增部署 → 網頁應用程式」，執行身分選「我」，存取權選「所有人」，授權存取試算表並完成部署。
5. 複製部署提供的 `https://script.google.com/macros/s/.../exec` 網址。程式會驗證秘密 token；不要把 token 放在網頁前端或公開文件。

若更新 Apps Script 程式碼，請在「部署 → 管理部署」編輯部署並選擇新版本，否則線上端仍會執行舊版本。評論功能加入後，也必須更新網頁應用程式版本，讓 `/exec?action=reviews` 和評論寫入分流生效。

## 2. 設定 Cloudflare Worker

到 Cloudflare Dashboard → Workers & Pages → `bike` → Settings → Variables and Secrets，設定：

| 名稱 | 類型 | 值 |
| --- | --- | --- |
| `GOOGLE_SHEETS_WEBHOOK_URL` | Variable | 上一步取得的 Apps Script 網頁應用程式網址 |
| `GOOGLE_SHEETS_TOKEN` | Secret | 與 Apps Script 的 `BOOKING_SHEETS_TOKEN` 完全相同 |

預約不需要 Resend、寄件網域或郵件金鑰。請勿將 Google token 寫進原始碼或前端。

## 3. 部署與驗證

在 Cloudflare 對 Worker 部署包含最新 `functions/api/bookings.js`、`src/worker.js` 及靜態資產的版本。使用正式網站送出一筆自己可辨認的測試需求，確認：

- Worker 回傳預約編號與「待確認」狀態。
- Google 試算表新增相同預約編號，並包含電話、日期時間、車種數量、車牌和預估金額。
- 不需要設定或寄送郵件。
- 測試送出一則評論後，「顧客評論」分頁新增「公開」列，並在評論頁確認星等和留言立即出現。

若網站顯示「Google 試算表尚未完成連線設定」，代表正式環境的 Cloudflare Worker 沒有同時讀到 `GOOGLE_SHEETS_WEBHOOK_URL` 和 `GOOGLE_SHEETS_TOKEN`；Google 搜尋索引只會收錄網頁，並不會替預約 API 設定試算表連線。請在 Cloudflare `bike` Worker 的 **Settings → Variables and Secrets → Production** 設定這兩個值：Webhook URL 使用 Apps Script 部署的 `/exec` 網址，token 必須與 Apps Script 指令碼屬性中的 `BOOKING_SHEETS_TOKEN` 完全相同。儲存後重新部署 Worker，再用正式網址送出一筆測試預約並確認新增到工作表。

若提示改為「預約資料沒有寫入 Google 試算表」或「目前無法連線至 Google 試算表」，代表兩個 Cloudflare 值已存在，但 Apps Script 回應、部署權限、試算表 ID 或 token 驗證仍有問題。請確認 Apps Script 網頁應用程式以「我」執行並允許「所有人」存取，且修改 Apps Script 後已更新部署版本。
