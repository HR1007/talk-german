# Supabase 郵件範本

Dashboard → Authentication → Emails（或 Email Templates）貼上：

| 範本 | 主旨 | 內容 |
|---|---|---|
| Confirm signup | 確認你的 Deutsch Translater 帳號 | confirm-signup.html |
| Magic Link | 登入 Deutsch Translater | magic-link.html |

`{{ .ConfirmationURL }}`、`{{ .Email }}` 是 Supabase 的變數，寄信時會自動換成真的連結和信箱，不要改掉。
