# Google 搜尋上線清單

網站已加入各頁專屬標題與摘要、店家地址電話結構化資料、`robots.txt` 和 `sitemap.xml`。這些內容可協助搜尋引擎理解網站，但不保證特定關鍵字排名或搜尋結果顯示方式。

## 部署後提交網站地圖

目前正式網址為 `https://bike.happybike.workers.dev`。Cloudflare 部署完成後，先確認以下網址可在無登入狀態開啟：

- `https://bike.happybike.workers.dev/`
- `https://bike.happybike.workers.dev/robots.txt`
- `https://bike.happybike.workers.dev/sitemap.xml`

接著使用店家的 Google 帳號開啟 Google Search Console，新增並驗證網站資源，在「Sitemap」提交 `https://bike.happybike.workers.dev/sitemap.xml`。可用「網址審查」檢查首頁、景點頁與評論頁，對重要頁面要求建立索引。Google 可能需要時間重新檢索；提交不代表保證收錄或排名。

## 維護 Google 商家檔案

搜尋「歡樂自行車 貢寮」並用店家 Google 帳號認領/驗證商家檔案。檢查商家名稱、地址、電話與網站網址是否和網站一致，補上正確營業時間、租車項目與實際店面照片。鼓勵有實際消費的顧客留下真實評價，不購買、製作或交換評價。

Google 商家檔案會影響 Google 搜尋與地圖上的商家資訊；請由店家本人完成認領、驗證及資料修改。

## 網址異動

若日後改用自有網域，需同步更新首頁 JSON-LD、三個頁面的 canonical 與 Open Graph URL、`robots.txt` 和 `sitemap.xml`，之後在 Search Console 驗證新網域並重新提交 sitemap。
