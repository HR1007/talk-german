// 生活常用單字：supabase/vocab/*.json → 檢查 → 產生
//   supabase/seed_vocab.sql  到 Supabase SQL Editor 執行，建表＋匯入（可重複執行）
//   public/vocab.json        網站的離線備援（資料庫還沒匯入或連不上時用）
import { readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const DIR = new URL('../supabase/vocab/', import.meta.url).pathname
const ROOT = new URL('../', import.meta.url).pathname

const themes = readdirSync(DIR)
  .filter((f) => f.endsWith('.json'))
  .sort()
  .flatMap((f) => JSON.parse(readFileSync(join(DIR, f), 'utf8')))

const errors = []
const seen = new Map()
const rows = []
const wordRe = (noun) => new RegExp(`(^|[^\\p{L}])${noun.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}([^\\p{L}]|$)`, 'u')

for (const t of themes) {
  for (const entry of t.words) {
    const [art, noun, plural, zh, de, deZh] = entry
    const key = `${art}-${noun}`
    if (entry.length !== 6) errors.push(`${t.theme} ${noun}：欄位數 ${entry.length}`)
    if (!['der', 'die', 'das'].includes(art)) errors.push(`${noun}：冠詞錯誤 ${art}`)
    if (seen.has(noun)) errors.push(`${noun} 重複（${seen.get(noun)}／${t.theme}）`)
    seen.set(noun, t.theme)
    if (!wordRe(noun).test(de)) errors.push(`${t.theme} ${noun}：例句沒有包含名詞 →「${de}」`)
    if (!zh || !de || !deZh) errors.push(`${noun}：缺少中文或例句`)
    rows.push({ seq: rows.length + 1, theme: t.theme, art, noun, plural, zh, de, deZh, key })
  }
}

// 和 B1 學術單字庫（src/data）重複的字也列出來，避免兩邊各一份
const academic = readFileSync(join(ROOT, 'src/data/days-1.ts'), 'utf8') + readFileSync(join(ROOT, 'src/data/days-2.ts'), 'utf8')
for (const r of rows) if (academic.includes(`noun: '${r.noun}'`)) errors.push(`${r.noun} 和 B1 學術單字重複`)

console.log(`${themes.length} 個主題、${rows.length} 個字`)
if (errors.length) {
  console.error(errors.join('\n'))
  process.exit(1)
}

const q = (s) => `'${String(s).replace(/'/g, "''")}'`
const values = rows.map((r) => `  (${r.seq}, ${q(r.theme)}, ${q(r.art)}, ${q(r.noun)}, ${q(r.plural)}, ${q(r.zh)}, ${q(r.de)}, ${q(r.deZh)})`)

const sql = `-- Talk German：生活常用單字（${rows.length} 字，${themes.length} 個主題）
-- 由 scripts/build-vocab.mjs 從 supabase/vocab/*.json 產生，請不要手動修改這個檔案。
-- 在 Supabase Dashboard → SQL Editor 整段貼上執行。可以重複執行：已存在的字會更新內容。

create table if not exists public.vocab (
  id bigint generated always as identity primary key,
  seq integer not null,
  theme text not null,
  article text not null check (article in ('der', 'die', 'das')),
  word text not null,
  plural text not null default '',
  meaning text not null,
  example text not null,
  example_zh text not null,
  created_at timestamptz not null default now(),
  unique (article, word)
);
create index if not exists vocab_seq_idx on public.vocab (seq);

-- 單字是公開教材：所有人都能讀，但只有在 Dashboard／SQL Editor 才能改
alter table public.vocab enable row level security;
drop policy if exists "vocab is public" on public.vocab;
create policy "vocab is public" on public.vocab for select to anon, authenticated using (true);
revoke insert, update, delete on public.vocab from anon, authenticated;
grant select on public.vocab to anon, authenticated;

insert into public.vocab (seq, theme, article, word, plural, meaning, example, example_zh) values
${values.join(',\n')}
on conflict (article, word) do update set
  seq = excluded.seq,
  theme = excluded.theme,
  plural = excluded.plural,
  meaning = excluded.meaning,
  example = excluded.example,
  example_zh = excluded.example_zh;

select count(*) as vocab_rows from public.vocab;
`
writeFileSync(join(ROOT, 'supabase/seed_vocab.sql'), sql)

const json = rows.map((r) => [r.seq, r.theme, r.art, r.noun, r.plural, r.zh, r.de, r.deZh])
writeFileSync(join(ROOT, 'public/vocab.json'), JSON.stringify(json))
console.log(`已產生 supabase/seed_vocab.sql（${(sql.length / 1024).toFixed(0)} KB）與 public/vocab.json`)
