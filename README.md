# Fomery

**[開啟 Fomery 封測版（Google 登入）](https://an4131754-collab.github.io/fomery-andy-preview/)**

和好友分享吃過的餐，也用月曆留下自己的用餐紀錄。

## 開始使用

1. 用 Google 帳號登入，設定暱稱。
2. 到「好友」，用好友 ID、邀請連結或 QR Code 送出申請。對方接受後，就能看彼此的餐照。
3. 點「＋記錄」發佈餐照，想寫心得也可以。到「個人」的月曆回看自己吃過的餐。

## 本機開發

需要 Node.js 22 以上。啟動後開啟 [本機預覽](http://127.0.0.1:8766/)。

```sh
npm ci --ignore-scripts
node serve.mjs
```

執行 `node --test` 跑測試，執行 `node build.mjs` 產生網站檔案。

<details>
<summary>連接自己的 Supabase</summary>

套用 [資料庫設定](supabase/migrations/202611240001_meal_journal.sql)，並設定 Google 登入與返回網址。 [Supabase Google 登入設定](https://supabase.com/docs/guides/auth/social-sign-in/auth-google)

啟動或建置前設定 `FOMERY_SUPABASE_URL` 和 `FOMERY_SUPABASE_PUBLISHABLE_KEY`。本機預覽預設會顯示示範餐照。

</details>
