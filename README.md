# Fomery · 餐桌筆記

以餐照分享和好友近況為主的手機網站。GitHub Pages 提供介面，Supabase 提供 Google 登入、好友關係和餐照同步。

## 本機預覽與多人連線

```sh
npm ci --ignore-scripts
node serve.mjs
```

在 [本機首頁](http://127.0.0.1:8766/) 可檢視十張示範餐照。設定多人連線後，使用者用 Google 登入、設定暱稱，以好友 ID、邀請連結或 QR Code 送出好友申請。對方接受後才看得到彼此的餐照。每位登入者的用餐月曆顯示自己的紀錄。

1. 在團隊的 Supabase 專案套用 [餐桌筆記資料表與存取權限](supabase/migrations/202611240001_meal_journal.sql)。
2. [設定 Supabase 的 Google 登入](https://supabase.com/docs/guides/auth/social-sign-in/auth-google)，在 Google 設定 Supabase 提供的回呼網址，在 Supabase 的 Redirect URLs 加入網站首頁的確切網址。使用測試模式時，加入兩個驗收用的 Google 帳號。
3. 啟動本機或執行 `node build.mjs` 前，設定 `FOMERY_SUPABASE_URL` 與 `FOMERY_SUPABASE_PUBLISHABLE_KEY`。建置會把可公開的瀏覽器設定寫入 `dist/journal-config.json`。Google OAuth secret 留在 Supabase 專案設定。
4. 驗收時在兩支手機用不同 Google 帳號登入。互加後各發布一餐，確認對方的「動態」可見，自己的「個人」月曆可見。用未互加的帳號確認餐照不可讀取。

## 原社群與寵物展示

既有的排行、群組、聚餐和寵物展示集中在 [原示範](http://127.0.0.1:8766/demo.html) 和 [介面比較](http://127.0.0.1:8766/ui-options.html)。

**[在手機開啟 andy-develop 預覽](https://an4131754-collab.github.io/fomery-andy-preview/)**。開發預覽使用獨立網址。

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

網站已透過 GitHub Actions 發布：https://bigpig8787.github.io/beli-flow-reconstruction/ 。公開後訪客皆可開啟，你的電腦不必保持開機。

官方文件：https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages

## 本機檢視

需要 Node.js 22 或更新版本：

```sh
npm ci --ignore-scripts
node serve.mjs
```

開啟 http://127.0.0.1:8766/demo.html 。Ctrl+C 停止服務。

在 `andy-develop`，首頁是「朋友近況」。底部點「記錄」，選照片後確認店家與分享對象，日期、同行者與糰子可以在「更多細節」調整。原先的 [介面比較頁](http://127.0.0.1:8766/ui-options.html) 仍可試用，三款各自保存試用資料。照片來源見 [攝影來源](preview-photos/CREDITS.md)。

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
- 我的美食地圖使用 Google Maps 內嵌畫面（台中市區），可拖曳、縮放。店名搜尋與路線另開 Google Maps；虛構示範店家不會標示在真實地圖上。需要網路才能載入地圖。
- 全站採最大 480px 的手機版面，八個主要功能固定在底部兩列，包含手機安全區留白。

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

本段描述原社群展示。新版的多人連線使用上述 Supabase 設定。

## 驗證與建置

```sh
node --test
node --check app.mjs
node --check social-ui.mjs
node build.mjs
```

測試涵蓋月曆與餐照分組、比較排名、初始資料、好友接受、群組與聚餐權限／名額、每日獎勵、進化、金幣與重複換裝。

另有測試驗證聊天室成員權限、訊息長度、寵物互動每日限額、發文成長紀錄及 Google Maps URL 編碼。新版的底欄與色彩沿用《餐桌筆記》的 [介面](https://an4131754-collab.github.io/table-notes-demo/)。
