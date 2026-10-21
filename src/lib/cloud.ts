import { createClient, type Session } from '@supabase/supabase-js'
import { useSyncExternalStore } from 'react'
import { WORD_BY_ID } from '../data'
import type { Article } from '../data/types'
import { dateKey } from './date'
import { vocabReady } from './vocab'
import { applyRemote, getState, setSyncHandler, type QuizRecord, type WordRecord } from './store'

/**
 * 雲端同步（Supabase）。沒登入時一切照舊存在 localStorage；
 * 登入後把本機與雲端合併，之後每次變更都順手寫一份到雲端。
 * publishable key 本來就會出現在前端，真正保護資料的是資料表上的 RLS（見 supabase/migration.sql）。
 */
const URL = import.meta.env.VITE_SUPABASE_URL as string | undefined
const KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined

export const supabase = URL && KEY
  ? createClient(URL, KEY, { auth: { flowType: 'pkce', persistSession: true, detectSessionInUrl: true } })
  : null

export type SyncState =
  | { kind: 'off' }
  | { kind: 'signed-out'; message?: string }
  | { kind: 'syncing'; email: string }
  | { kind: 'synced'; email: string; at: string }
  | { kind: 'error'; email: string; message: string }

let sync: SyncState = supabase ? { kind: 'signed-out' } : { kind: 'off' }
let session: Session | null = null
const listeners = new Set<() => void>()
const setSync = (s: SyncState) => {
  sync = s
  listeners.forEach((l) => l())
}

export function useSync() {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l)
      return () => listeners.delete(l)
    },
    () => sync,
  )
}

/* ---------- 對應 ---------- */

type Row = {
  id: number
  word: string
  article: Article
  meaning: string | null
  status: string
  correct_count: number | null
  incorrect_count: number | null
  streak: number | null
  added_on: string | null
  created_at: string
  updated_at: string | null
}

const keyOf = (art: string, word: string) => `${art}-${word}`
const rowIds = new Map<string, number>() // 本機字 id → user_words.id（寫 quiz_results 時要用）

function toRecord(r: Row): WordRecord {
  return {
    status: r.status === 'learned' || r.status === 'mastered' ? 'learned' : 'learning',
    addedAt: r.added_on ?? r.created_at.slice(0, 10),
    correct: r.correct_count ?? 0,
    wrong: r.incorrect_count ?? 0,
    streak: r.streak ?? 0,
    updatedAt: r.updated_at ?? r.created_at,
  }
}

function toRow(id: string, rec: WordRecord) {
  const w = WORD_BY_ID.get(id)
  if (!w) return null
  return {
    word: w.noun,
    article: w.art,
    meaning: w.zh,
    status: rec.status,
    correct_count: rec.correct,
    incorrect_count: rec.wrong,
    streak: rec.streak,
    added_on: rec.addedAt,
    updated_at: rec.updatedAt,
  }
}

function fail(e: unknown) {
  const email = session?.user.email ?? ''
  const msg = e && typeof e === 'object' && 'message' in e ? String((e as { message: string }).message) : '同步失敗'
  const hint = /relation|column|schema cache|does not exist/i.test(msg) ? '資料庫還沒更新，請先在 Supabase 執行 migration.sql' : msg
  setSync({ kind: 'error', email, message: hint })
}

function ok() {
  if (session) setSync({ kind: 'synced', email: session.user.email ?? '', at: new Date().toISOString() })
}

/* ---------- 寫入 ---------- */

async function upsertWords(entries: [string, WordRecord][]) {
  if (!supabase || !session || entries.length === 0) return
  const rows = entries.map(([id, rec]) => toRow(id, rec)).filter((r): r is NonNullable<typeof r> => Boolean(r))
  const { data, error } = await supabase
    .from('user_words')
    .upsert(rows, { onConflict: 'user_id,article,word' })
    .select('id, article, word')
  if (error) throw error
  for (const r of data ?? []) rowIds.set(keyOf(r.article, r.word), r.id)
}

async function wordRowId(id: string) {
  if (rowIds.has(id)) return rowIds.get(id)!
  const rec = getState().words[id]
  if (rec) await upsertWords([[id, rec]])
  return rowIds.get(id)
}

let queue: Promise<void> = Promise.resolve()
const enqueue = (job: () => Promise<void>) => {
  queue = queue.then(job).then(ok, fail)
}

setSyncHandler({
  word(id, rec) {
    if (!session) return
    enqueue(() => upsertWords([[id, rec]]))
  },
  removeWord(id) {
    if (!session || !supabase) return
    const w = WORD_BY_ID.get(id)
    if (!w) return
    enqueue(async () => {
      const { error } = await supabase!.from('user_words').delete().eq('article', w.art).eq('word', w.noun)
      if (error) throw error
      rowIds.delete(id)
    })
  },
  day(day) {
    if (!session || !supabase) return
    enqueue(async () => {
      const { error } = await supabase!.from('study_days').upsert({ day }, { onConflict: 'user_id,day', ignoreDuplicates: true })
      if (error) throw error
    })
  },
  answer(a) {
    if (!session || !supabase) return
    enqueue(async () => {
      const wordId = await wordRowId(a.wordId)
      if (!wordId) return
      const { error } = await supabase!.from('quiz_results').insert({
        quiz_id: a.quizId,
        word_id: wordId,
        is_correct: a.ok,
        answer: a.answer,
        question_type: a.type,
        scope: a.scope,
      })
      if (error) throw error
    })
  },
  reset() {
    if (!session || !supabase) return
    enqueue(async () => {
      const uid = session!.user.id
      for (const t of ['quiz_results', 'study_days', 'user_words'] as const) {
        const { error } = await supabase!.from(t).delete().eq('user_id', uid)
        if (error) throw error
      }
      rowIds.clear()
    })
  },
})

/* ---------- 登入後合併 ---------- */

async function pullAndMerge() {
  if (!supabase || !session) return
  setSync({ kind: 'syncing', email: session.user.email ?? '' })
  try {
    await vocabReady()
    const [words, days, results] = await Promise.all([
      supabase.from('user_words').select('id, word, article, meaning, status, correct_count, incorrect_count, streak, added_on, created_at, updated_at'),
      supabase.from('study_days').select('day'),
      supabase.from('quiz_results').select('quiz_id, is_correct, scope, created_at').not('quiz_id', 'is', null).order('created_at', { ascending: false }).limit(600),
    ])
    for (const r of [words, days, results]) if (r.error) throw r.error

    const local = getState()
    const remote = new Map<string, WordRecord>()
    for (const r of (words.data ?? []) as Row[]) {
      const id = keyOf(r.article, r.word)
      if (!WORD_BY_ID.has(id)) continue
      rowIds.set(id, r.id)
      remote.set(id, toRecord(r))
    }

    // 兩邊都有的字以 updatedAt 較新的為準；只在本機的字推上雲端
    const merged: Record<string, WordRecord> = {}
    const push: [string, WordRecord][] = []
    for (const id of new Set([...Object.keys(local.words), ...remote.keys()])) {
      const l = local.words[id]
      const r = remote.get(id)
      if (l && (!r || l.updatedAt > r.updatedAt)) {
        merged[id] = l
        push.push([id, l])
      } else if (r) merged[id] = r
    }

    const remoteDays = new Set((days.data ?? []).map((d) => d.day as string))
    const activity = [...new Set([...local.activity, ...remoteDays])].sort()
    const newDays = local.activity.filter((d) => !remoteDays.has(d))

    // 把每題作答依 quiz_id 合成「一次測驗」
    const groups = new Map<string, QuizRecord>()
    for (const r of results.data ?? []) {
      const id = r.quiz_id as string
      const g = groups.get(id) ?? { id, date: dateKey(new Date(r.created_at)), scope: r.scope ?? '', total: 0, correct: 0 }
      g.total++
      if (r.is_correct) g.correct++
      groups.set(id, g)
    }
    const quizzes = [...local.quizzes.filter((q) => !q.id || !groups.has(q.id)), ...groups.values()]
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 30)

    applyRemote({ words: merged, activity, quizzes })

    await upsertWords(push)
    if (newDays.length) {
      const { error } = await supabase.from('study_days').upsert(newDays.map((day) => ({ day })), { onConflict: 'user_id,day', ignoreDuplicates: true })
      if (error) throw error
    }
    ok()
  } catch (e) {
    fail(e)
  }
}

/* ---------- 登入／登出 ---------- */

export async function sendMagicLink(email: string) {
  if (!supabase) throw new Error('雲端同步沒有設定')
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: `${window.location.origin}${import.meta.env.BASE_URL}` },
  })
  if (error) throw error
}

/** 信裡的數字驗證碼登入：不經過網址跳轉，也不限定同一個瀏覽器 */
export async function verifyCode(email: string, code: string) {
  if (!supabase) throw new Error('雲端同步沒有設定')
  const { error } = await supabase.auth.verifyOtp({ email, token: code, type: 'email' })
  if (error) throw error
}

export async function signOut() {
  await supabase?.auth.signOut()
}

// 從信裡的連結回來時網址會帶 ?code=（成功）或 ?error_description=（失效）
const params = new URLSearchParams(window.location.search)
const arrivedWithCode = params.has('code')
const linkError = params.get('error_description')

function linkFailedMessage(raw?: string | null) {
  if (raw && /expired/i.test(raw)) return '登入連結已過期，請重新寄一封，或直接輸入信裡的驗證碼。'
  return '這個登入連結沒辦法用（可能是舊的連結，或用不同的瀏覽器打開）。請輸入信裡的驗證碼，或重新寄一封。'
}

if (supabase) {
  if (linkError) {
    setSync({ kind: 'signed-out', message: linkFailedMessage(linkError) })
    window.history.replaceState(null, '', window.location.pathname + window.location.hash)
  }
  supabase.auth.onAuthStateChange((event, s) => {
    const before = session?.user.id
    session = s
    if (!s) {
      rowIds.clear()
      const failed = event === 'INITIAL_SESSION' && arrivedWithCode
      setSync({ kind: 'signed-out', message: failed ? linkFailedMessage() : sync.kind === 'signed-out' ? sync.message : undefined })
      if (failed) window.history.replaceState(null, '', window.location.pathname + window.location.hash)
      return
    }
    // INITIAL_SESSION（重新整理）與 SIGNED_IN（點了信裡的連結）都要合併一次；換 token 不用
    if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION' || before !== s.user.id) {
      // 登入回呼網址會帶 ?code=，合併後把它從網址列拿掉
      if (window.location.search.includes('code=')) {
        window.history.replaceState(null, '', window.location.pathname + window.location.hash)
      }
      setTimeout(() => void pullAndMerge(), 0)
    }
  })
}
