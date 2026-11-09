# Fomery · 社群與寵物互動 Demo

原生 HTML、CSS、JavaScript 製作的 Beli-inspired 非官方展示模型。採 GitHub Pages 靜態發布，沒有付費 API 或後端服務。

## GitHub Pages 發布

已加入 `.github/workflows/pages.yml`。推送至 `main` 會先測試，再用 `build.mjs` 產生 `dist/` 並發布。資源採相對路徑，支援 GitHub Pages 的專案子目錄。

首次發布（需有儲存庫管理權限）：

1. 將修改上傳到自己的 `Bigpig8787/beli-flow-reconstruction`，包含 `.github/workflows/pages.yml`。
2. 在儲存庫 **Settings → Pages → Build and deployment → Source** 選 **GitHub Actions**。
3. 在 **Actions → Publish GitHub Pages → Run workflow** 執行第一次發布。若 fork 的 Actions 尚未啟用，先啟用。
4. 等流程成功，使用 deployment 輸出的網址。預期為 `https://bigpig8787.github.io/beli-flow-reconstruction/`；這不是已發布成功的保證。

在此資料夾上傳的指令：

```sh
git add .
git commit -m "feat: add social dining and pet demo with GitHub Pages"
git push origin main
```

目前環境連不到 GitHub，因此只完成本機檔案與發布設定，尚未完成遠端推送或啟用 Pages。公開後訪客皆可開啟，你的電腦不必保持開機。

官方文件：https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages

## 本機檢視

需要 Node.js 22 或更新版本，無須安裝 npm 套件：

```sh
node serve.mjs
```

開啟 http://127.0.0.1:8766 。Ctrl+C 停止服務；不要直接雙擊 HTML。

## 90 秒社群展示流程

1. **好友與群組**：以「你」向 Mika 送邀請，切成 Mika 接受，再切回「你」。加入「週末咖啡散步」，觀看成員的寵物。
2. **聚餐**：輸入名稱、群組、餐廳、未來時間與人數上限，建立活動並邀請 Jamie。切成 Jamie 接受，切成 Alex 則可以自行加入。不會超額；一般參加者也能退出。
3. **寵物**：切回「你」，發第一篇群組貼文。初始 40 XP 加上獎勵 20 XP，直接展示寶寶進化。用 80 金幣買「小小主廚」，到好友與群組看換裝成果。
4. **定期發文**：寵物頁按「模擬隔天」，再發文領取新一天的獎勵，繼續養成。

介面內也提供「90 秒展示路線」。每輪展示前按「重設展示資料」還原所有情境。

## 展示規則

- 群組聊天室：加入群組後可發送 1–200 字訊息，切換角色可模擬朋友回覆。聊天不會領取發文獎勵。
- 寵物互動：在群組寵物櫥窗點「一起玩」，雙方各獲得 5 XP，群組會顯示互動紀錄。同一對寵物每日只能互動一次，跨群組或交換角色也不能重複領取。
- 發文回饋：發布後立即顯示成長卡，包含前後型態、XP、金幣、進化提示與下一階段進度。貼文也保留該次成長摘要；同日重複發文明確顯示 +0 XP。
- Google Maps：探索與清單地圖改為地圖／清單配置。輸入真實店名、地址或地區＋料理後，可以另開 Google Maps 搜尋或規劃路線。餐廳詳情提供同類餐廳搜尋；虛構餐廳不會被當成真實地址。
- 地圖串接使用免 API key 的 Google Maps URLs，並非內嵌 Google 地圖；需網路才能查看 Google Maps。示意標記仍保留供展示。官方規格：https://developers.google.com/maps/documentation/urls/get-started

- 好友：送邀請 → 對方角色接受。防止重複邀請與重複新增。
- 群組：加入公開示範群組後可發文、看成員寵物、參加所屬活動。
- 聚餐：主辦人可邀請好友；邀請不會自動報名，朋友需自己接受。群組成員也能直接加入。上限 2–12 人，包含主辦人。
- 養成：每個角色每日第一篇群組貼文獲得 **20 XP + 30 金幣**；同日後續貼文不重複領獎，所有群組共用每日限額。
- 進化：0 XP 糰子寶寶 → 60 XP 美食探險家 → 140 XP 餐桌守護神。
- 商店：示範金幣購買 Skin 並穿戴；已購買造型可免費換裝。沒有真實支付或扣款。
- 角色切換只套用社群、活動與寵物；原有餐廳排行保留同一份個人展示資料。
- 原有搜尋、收藏、兩兩比較、排行、筆記與示意地圖仍可操作。

## 模型與真實產品的界線

店家、朋友、寵物與地圖皆為示範資料。多人行為由「示範角色切換」模擬，**不同裝置或訪客不會同步**，不會發送真正的好友或聚餐通知。

資料存在瀏覽器 localStorage 的 `table-notes-demo-v2`，重新整理後保留；原版 `table-notes-v1` 不受影響。換網域或清除瀏覽器資料會回到初始狀態。「模擬隔天」會推進所有角色的展示日期。

真實多人版本需另接登入、資料庫與通知服務；GitHub Pages 只提供靜態網站檔案。

## 驗證與建置

```sh
node --test
node --check app.mjs
node --check social-ui.mjs
node build.mjs
```

測試涵蓋比較排名、初始資料、好友接受、群組與聚餐權限／名額、每日獎勵、進化、金幣與重複換裝。瀏覽器自動化環境不可用，尚未完成視覺與瀏覽器端點擊驗證。

另有測試驗證聊天室成員權限、訊息長度、寵物互動每日限額、發文成長紀錄及 Google Maps URL 編碼。參考頁 https://an4131754-collab.github.io/table-notes-demo/ 目前無法讀取，因此尚未完成與參考頁的排版比對。
