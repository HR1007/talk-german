# Deutsch Translater · Talk German

德文語音即時翻譯，加上每天 10 個德文單字（含冠詞、複數、例句）、一個 B1 句型、單字庫與自訂測驗。

- 線上版：https://hr1007.github.io/talk-german/
- 設計稿：Figma「作品集（面試用）」→「德語助手網站」頁的「每日單字 ·」系列 frame

## 功能

| 分頁 | 內容 |
|---|---|
| 翻譯 | 即時錄音（瀏覽器語音辨識 de-DE，Chrome／Edge）、文字輸入 → 繁體中文（MyMemory API）。音檔上傳需要伺服器，連到原版。 |
| 每日單字 | 依日期輪替，同一天所有人同一組。**生活常用 1,048 字**（Supabase `vocab` 表）或 **B1 學術 200 字**（寫在程式裡）。學習卡、今日句型＋重組練習、完成頁。 |
| 單字庫 | 標記過的字：已熟背／學習中、搜尋、冠詞篩選、正確率。 |
| 測驗 | 範圍 × 題型（冠詞、例句填空、中翻德、複數）× 題數。答錯放回學習中，連續答對 3 次移到已熟背。 |

## 資料

| 資料 | 存放 |
|---|---|
| 生活常用單字 | `supabase/vocab/*.json` → `npm run vocab` → `supabase/seed_vocab.sql`（匯入資料庫）＋ `public/vocab.json`（離線備援） |
| B1 學術單字與句型 | `src/data/days-*.ts`，`npm run check-data` 檢查 |
| 使用者紀錄 | 一律先存 localStorage；用 email 登入後同步到 Supabase（`user_words`、`quiz_results`、`study_days`） |

## Supabase 設定（第一次）

1. SQL Editor 執行 `supabase/migration.sql`（使用者資料表欄位、RLS）。
2. SQL Editor 執行 `supabase/seed_vocab.sql`（建立 `vocab` 表並匯入單字；改過 json 後重跑 `npm run vocab` 再執行一次即可）。
3. Authentication → URL Configuration：Site URL 填 `https://hr1007.github.io/talk-german/`，Redirect URLs 加上同一個網址與 `http://localhost:5173/talk-german/`。
4. Advisors → Security Advisor 確認沒有紅黃警告。

只用 publishable key（放在 `.env.local`，見 `.env.example`）。secret key 不要放進這個專案。

## 開發與部署

```bash
npm install
npm run dev          # http://localhost:5173/talk-german/
npm run check-data   # 檢查 B1 學術單字
npm run vocab        # 檢查生活單字並重新產生 SQL / JSON
npm run deploy       # build（含型別檢查）後推到 gh-pages 分支
```
