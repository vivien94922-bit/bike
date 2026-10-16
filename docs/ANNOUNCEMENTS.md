# 網站公告

公告獨立頁面會讀取預約試算表中名為「公告」的第二個分頁：[開啟試算表](https://docs.google.com/spreadsheets/d/1DjWHXiweBQzOwWtLERMF7w3l-GZ-xdoFdc_0phqLAqA/edit?gid=1994569365#gid=1994569365)。欄位順序為「公告日期、標題、公告內容、發布狀態」。新增一列並將狀態設成「公開」即可刊登；「草稿」或「下架」不會顯示。

首頁及內頁頂端的預約優惠文字是固定提示：「預約享八折優惠（限租車之前），不限使用次數」。試算表公告會另外列在「公告」獨立頁。

若尚未部署公告讀取功能，請先更新現有 Apps Script 網頁應用程式版本，再部署加入 `/api/announcements` 的 Cloudflare Worker。公告讀取使用獨立的唯讀 API 路由，不變更預約和評論 API。
