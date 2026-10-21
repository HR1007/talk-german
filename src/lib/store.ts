import { useSyncExternalStore } from 'react'
import { addDays, dateKey } from './date'

/**
 * 使用者的單字資料庫。一律先存在瀏覽器的 localStorage（沒登入、沒網路也能用）；
 * 登入後由 cloud.ts 透過 setSyncHandler 把每次變更同步到 Supabase。
 */
export type Status = 'learning' | 'learned'

export type WordRecord = {
  status: Status
  /** 第一次標記的日期 */
  addedAt: string
  correct: number
  wrong: number
  /** 測驗連續答對次數，達 3 次自動移到已熟背 */
  streak: number
  /** 最後修改時間（ISO），本機與雲端合併時以較新的為準 */
  updatedAt: string
}

export type QuizRecord = { id?: string; date: string; scope: string; total: number; correct: number }

export type Theme = 'light' | 'dark'
export type Track = 'life' | 'academic'

export type State = {
  v: 1
  words: Record<string, WordRecord>
  /** 有學習紀錄的日期，用來算連續天數 */
  activity: string[]
  quizzes: QuizRecord[]
  theme: Theme | null
  /** 每日單字要看哪一套：生活常用（資料庫）或 B1 學術 */
  track?: Track
}

export type AnswerEvent = { quizId: string; wordId: string; ok: boolean; answer: string; type: string; scope: string }

type SyncHandler = {
  word: (id: string, rec: WordRecord) => void
  removeWord: (id: string) => void
  day: (day: string) => void
  answer: (a: AnswerEvent) => void
  reset: () => void
}

const KEY = 'talk-german-v1'
const EMPTY: State = { v: 1, words: {}, activity: [], quizzes: [], theme: null }

function load(): State {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return EMPTY
    const data = JSON.parse(raw) as State
    if (data.v !== 1) return EMPTY
    // 舊資料沒有 updatedAt：用加入日期補上，合併時雲端較新的會蓋過去
    for (const r of Object.values(data.words ?? {})) r.updatedAt ??= `${r.addedAt}T00:00:00.000Z`
    return { ...EMPTY, ...data }
  } catch {
    return EMPTY
  }
}

let state: State = load()
let sync: SyncHandler | null = null
const listeners = new Set<() => void>()

function commit(next: State) {
  state = next
  try {
    localStorage.setItem(KEY, JSON.stringify(state))
  } catch {
    // 無痕模式或儲存空間被封鎖：這次瀏覽照常可用，只是不會留下來
  }
  listeners.forEach((l) => l())
}

function subscribe(l: () => void) {
  listeners.add(l)
  return () => listeners.delete(l)
}

export function useStore() {
  return useSyncExternalStore(subscribe, () => state)
}

export const getState = () => state

export function setSyncHandler(h: SyncHandler) {
  sync = h
}

/** 雲端合併完的結果整批寫回本機（不觸發再次上傳） */
export function applyRemote(part: Pick<State, 'words' | 'activity' | 'quizzes'>) {
  commit({ ...state, ...part })
}

function withActivity(s: State): State {
  const today = dateKey()
  if (s.activity.includes(today)) return s
  sync?.day(today)
  return { ...s, activity: [...s.activity, today] }
}

function record(id: string): WordRecord {
  return state.words[id] ?? { status: 'learning', addedAt: dateKey(), correct: 0, wrong: 0, streak: 0, updatedAt: new Date().toISOString() }
}

function saveWord(id: string, rec: WordRecord) {
  const next = { ...rec, updatedAt: new Date().toISOString() }
  commit(withActivity({ ...state, words: { ...state.words, [id]: next } }))
  sync?.word(id, next)
}

export function markWord(id: string, status: Status) {
  saveWord(id, { ...record(id), status })
}

export function removeWord(id: string) {
  const words = { ...state.words }
  delete words[id]
  commit({ ...state, words })
  sync?.removeWord(id)
}

/** 測驗作答：答對累積連續次數，答錯歸零；autoLearning 時答錯的字放回學習中 */
export function recordAnswer(id: string, ok: boolean, autoLearning: boolean, event: Omit<AnswerEvent, 'wordId' | 'ok'>) {
  const r = record(id)
  if (ok) {
    const streak = r.streak + 1
    saveWord(id, { ...r, correct: r.correct + 1, streak, status: streak >= 3 ? 'learned' : r.status })
  } else {
    saveWord(id, { ...r, wrong: r.wrong + 1, streak: 0, status: autoLearning ? 'learning' : r.status })
  }
  sync?.answer({ ...event, wordId: id, ok })
}

export function addQuiz(q: QuizRecord) {
  commit({ ...state, quizzes: [q, ...state.quizzes].slice(0, 30) })
}

export function setTrack(track: Track) {
  commit({ ...state, track })
}

export function setTheme(theme: Theme) {
  commit({ ...state, theme })
}

export function resetAll() {
  commit({ ...EMPTY, theme: state.theme })
  sync?.reset()
}

/** 連續學習天數：從今天（今天還沒學就從昨天）往回數 */
export function streakDays(s: State) {
  const set = new Set(s.activity)
  let day = dateKey()
  if (!set.has(day)) day = addDays(day, -1)
  let n = 0
  while (set.has(day)) {
    n++
    day = addDays(day, -1)
  }
  return n
}

export function accuracy(r?: WordRecord) {
  if (!r || r.correct + r.wrong === 0) return null
  return Math.round((r.correct / (r.correct + r.wrong)) * 100)
}
