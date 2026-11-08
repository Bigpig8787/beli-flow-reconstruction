# 餐桌筆記

[開啟線上展示](https://an4131754-collab.github.io/table-notes-demo/)

以原生 HTML、CSS 與 JavaScript 自行重建的餐廳紀錄互動示範。介面參考使用者提供的 Beli 操作錄影，以及 Android 10.7.0 的介面行為分析。

## 本次介面更新

- 白底、深青色與手機底部五個導覽入口。
- 餐廳搜尋、最近搜尋、地圖詳細頁及自己的評價摘要。
- 分段評價卡片、三種感受、可展開的用餐細節及動態隱藏開關。
- 兩兩比較、上一步、同分、換題，以及比較中的餐廳資訊。
- 清單／地圖切換、個人用餐統計與三步導覽。
- 評價 **1 家**即可解鎖示範推薦；累積 10 家後顯示分數。
- 探索頁與餐廳頁可輸入真實店名或地址，點開 Google Maps／Apple 地圖。使用官方地圖搜尋連結，不需要 API 金鑰；手機是否切換到地圖 App 由裝置決定。
- 探索頁直接嵌入 Google Maps 真實地圖，可拖曳、縮放，並可按「回到台中」恢復預設視角。兩家的外開入口同時保留。

## 本機執行

需要 Node.js。執行 `node serve.mjs`，開啟 <http://127.0.0.1:8766/>。執行 `node --test` 可驗證排名、比較與解鎖邏輯。

## 範圍

探索頁上方是 Google Maps 真實地圖；「我的示範足跡」、清單與餐廳頁仍使用虛構店家及示意位置。評價、照片、收藏只儲存在目前瀏覽器。沒有連接 Beli 帳號、原版推薦服務、真實訂位或好友系統；清除瀏覽器資料會移除紀錄，不同網址的紀錄不會同步。

原版截圖、APK、程式包、字型與圖像未收錄於此儲存庫。這是獨立重建的示範，並非 Beli 官方產品；字型使用系統後備字型，並非完整重現原版字型。

地圖連結依據 [Google Maps URLs](https://developers.google.com/maps/documentation/urls/get-started) 與 [Apple 統一地圖網址](https://developer.apple.com/documentation/mapkit/unified-map-urls)。頁內 Google 地圖使用[官方分享／嵌入流程](https://support.google.com/maps/answer/7101463)產生的公開嵌入碼，不包含帳號或私人地點。

此嵌入地圖預設台中市區；輸入框的店家搜尋會另開地圖網站，並不更新嵌入視角，也未在真實地圖上顯示或儲存本機示範評分。若要串接搜尋結果、自己的店家標記與即時推薦，需要另外接上正式地圖／店家 API。Apple 頁內地圖需要 Apple Developer Maps token，這版依使用者選擇先保留 Apple 外開連結。Google 地圖需要網路，載入失敗時可使用外開入口。
