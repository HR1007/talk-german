import { DAYS_1 } from './days-1'
import { DAYS_2 } from './days-2'
import type { Day, Word } from './types'

/** B1 學術單字：20 天，每天附一個句型，寫在程式裡 */
export const DAYS: Day[] = [...DAYS_1, ...DAYS_2]

export type Track = 'life' | 'academic'

/** 每個字的唯一 id：冠詞 + 名詞，例如 die-Prüfung */
export const wordId = (w: Word) => `${w.art}-${w.noun}`

export type WordWithDay = Word & { id: string; day: number; track: Track }

export const ALL_WORDS: WordWithDay[] = DAYS.flatMap((d, day) => d.words.map((w) => ({ ...w, id: wordId(w), day, track: 'academic' as const })))

/** 所有認得的字。生活單字從資料庫載入後用 registerWords 加進來 */
export const WORD_BY_ID = new Map<string, WordWithDay>(ALL_WORDS.map((w) => [w.id, w]))

export function registerWords(words: WordWithDay[]) {
  for (const w of words) if (!WORD_BY_ID.has(w.id) || WORD_BY_ID.get(w.id)!.track === 'life') WORD_BY_ID.set(w.id, w)
}
