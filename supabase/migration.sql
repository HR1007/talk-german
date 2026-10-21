-- Talk German：每日單字資料庫
-- 在 Supabase Dashboard → SQL Editor 整段貼上執行。可以重複執行（全部是 if not exists / 先刪再建），
-- 只會「新增」欄位、索引與權限規則，不會刪除任何既有資料。

-- ---------- user_words：每位使用者標記過的字 ----------
-- 既有欄位：id, user_id, word, article, meaning, status, created_at, correct_count, incorrect_count
alter table public.user_words add column if not exists streak integer not null default 0;
alter table public.user_words add column if not exists added_on date not null default current_date;
alter table public.user_words add column if not exists updated_at timestamptz not null default now();
alter table public.user_words alter column user_id set default auth.uid();

-- 同一個人同一個字只有一列（網站用 upsert 依這組鍵更新）
create unique index if not exists user_words_user_article_word_key
  on public.user_words (user_id, article, word);

-- status 若原本有限制值，改成同時允許舊值與網站用的 learning / learned
do $$
declare c record;
begin
  for c in
    select con.conname
    from pg_constraint con
    join pg_attribute att on att.attrelid = con.conrelid and att.attnum = any (con.conkey)
    where con.conrelid = 'public.user_words'::regclass and con.contype = 'c' and att.attname = 'status'
  loop
    execute format('alter table public.user_words drop constraint %I', c.conname);
  end loop;
end $$;
alter table public.user_words
  add constraint user_words_status_check check (status in ('learning', 'learned', 'mastered', 'new'));

-- ---------- quiz_results：每一題的作答 ----------
-- 既有欄位：id, user_id, word_id (→ user_words.id), is_correct, answer, created_at
alter table public.quiz_results add column if not exists quiz_id uuid;
alter table public.quiz_results add column if not exists question_type text;
alter table public.quiz_results add column if not exists scope text;
alter table public.quiz_results alter column user_id set default auth.uid();
create index if not exists quiz_results_user_quiz_idx on public.quiz_results (user_id, quiz_id, created_at desc);

-- ---------- study_days：有學習的日期（算連續天數） ----------
create table if not exists public.study_days (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  day date not null,
  primary key (user_id, day)
);

-- ---------- Row Level Security：每個人只看得到、改得到自己的資料 ----------
alter table public.user_words enable row level security;
alter table public.quiz_results enable row level security;
alter table public.study_days enable row level security;

drop policy if exists "own words" on public.user_words;
create policy "own words" on public.user_words
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

drop policy if exists "own quiz results" on public.quiz_results;
create policy "own quiz results" on public.quiz_results
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

drop policy if exists "own study days" on public.study_days;
create policy "own study days" on public.study_days
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

grant select, insert, update, delete on public.user_words, public.quiz_results, public.study_days to authenticated;
revoke all on public.user_words, public.quiz_results, public.study_days from anon;
