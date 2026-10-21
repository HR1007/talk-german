import { useSyncExternalStore } from 'react'
import { registerWords, type WordWithDay } from '../data'
import type { Article, Day, Word } from '../data/types'
import { dateKey } from './date'

/**
 * 生活常用單字（1,000+ 字）。來源是 Supabase 的 vocab 表；
 * 資料庫還沒匯入或連不上時，改讀網站附的 vocab.json（同一份資料產生的備援）。
 * 讀到的字會快取在 localStorage，每天最多重新抓一次。
 */
type Raw = [number, string, Article, string, string, string, string, string]
type Source = 'database' | 'bundled' | 'cache'

type VocabState =
  | { kind: 'loading' }
  | { kind: 'ready'; source: Source; words: WordWithDay[]; days: Pick<Day, 'theme' | 'words'>[] }
  | { kind: 'error' }

const CACHE_KEY = 'talk-german-vocab-v1'
let state: VocabState = { kind: 'loading' }
const listeners = new Set<() => void>()
let loading: Promise<void> | null = null

function set(next: VocabState) {
  state = next
  listeners.forEach((l) => l())
}

export function useVocab() {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l)
      return () => listeners.delete(l)
    },
    () => state,
  )
}

function build(raw: Raw[], source: Source) {
  const sorted = [...raw].sort((a, b) => a[0] - b[0])
  const days: Pick<Day, 'theme' | 'words'>[] = []
  const words: WordWithDay[] = []
  for (let i = 0; i < sorted.length; i += 10) {
    const chunk = sorted.slice(i, i + 10)
    const dayWords: Word[] = chunk.map(([, , art, noun, plural, zh, de, deZh]) => ({ art, noun, plural, zh, de, deZh }))
    const themes = [...new Set(chunk.map((r) => r[1]))]
    days.push({ theme: themes.join('・'), words: dayWords })
    dayWords.forEach((w) => words.push({ ...w, id: `${w.art}-${w.noun}`, day: days.length - 1, track: 'life' }))
  }
  registerWords(words)
  set({ kind: 'ready', source, words, days })
}

async function fromDatabase(): Promise<Raw[] | null> {
  const { supabase } = await import('./cloud')
  if (!supabase) return null
  const out: Raw[] = []
  // PostgREST 一次最多回 1,000 列，分頁抓
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase
      .from('vocab')
      .select('seq, theme, article, word, plural, meaning, example, example_zh')
      .order('seq')
      .range(from, from + 999)
    if (error) return null
    out.push(...data.map((r) => [r.seq, r.theme, r.article, r.word, r.plural, r.meaning, r.example, r.example_zh] as Raw))
    if (data.length < 1000) break
  }
  return out.length ? out : null
}

async function fromBundle(): Promise<Raw[]> {
  const res = await fetch(`${import.meta.env.BASE_URL}vocab.json`)
  if (!res.ok) throw new Error('vocab.json')
  return (await res.json()) as Raw[]
}

export function loadVocab() {
  if (loading) return loading
  loading = (async () => {
    let cached: { date: string; source: Source; rows: Raw[] } | null = null
    try {
      cached = JSON.parse(localStorage.getItem(CACHE_KEY) ?? 'null')
    } catch {
      cached = null
    }
    if (cached?.rows?.length) build(cached.rows, 'cache')
    if (cached?.date === dateKey() && cached.source === 'database') return

    try {
      const db = await fromDatabase()
      const rows = db ?? (await fromBundle())
      const source: Source = db ? 'database' : 'bundled'
      build(rows, source)
      try {
        localStorage.setItem(CACHE_KEY, JSON.stringify({ date: dateKey(), source, rows }))
      } catch {
        // 快取存不下就算了，下次重新抓
      }
    } catch {
      if (state.kind !== 'ready') set({ kind: 'error' })
    }
  })()
  return loading
}

/** 雲端合併前要先有完整的字表，否則生活單字的紀錄會被當成不認識的字丟掉 */
export const vocabReady = () => loadVocab()
