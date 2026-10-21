import { DAYS, WORD_BY_ID, type Track, type WordWithDay } from '../data'
import type { Day, Word } from '../data/types'
import { dateKey, dayNumber } from './date'
import { useStore } from './store'
import { useVocab } from './vocab'

export type Today = {
  key: string
  track: Track
  /** 第幾組（0 起算）與總組數 */
  index: number
  total: number
  day: Day
  words: WordWithDay[]
  /** 生活單字還在載入，先顯示學術那組 */
  pending: boolean
}

const mod = (n: number, m: number) => ((n % m) + m) % m

/** 今天這組字。同一天所有人拿到同一組；生活單字的句型輪流套用 20 個 B1 句型 */
export function useToday(): Today {
  const s = useStore()
  const vocab = useVocab()
  const key = dateKey()
  const n = dayNumber(key)
  const want: Track = s.track ?? 'life'

  if (want === 'life' && vocab.kind === 'ready' && vocab.days.length) {
    const index = mod(n, vocab.days.length)
    const d = vocab.days[index]
    const day: Day = { theme: d.theme, words: d.words, grammar: DAYS[mod(n, DAYS.length)].grammar }
    return { key, track: 'life', index, total: vocab.days.length, day, words: toWords(d.words), pending: false }
  }
  const index = mod(n, DAYS.length)
  const day = DAYS[index]
  return { key, track: 'academic', index, total: DAYS.length, day, words: toWords(day.words), pending: want === 'life' && vocab.kind === 'loading' }
}

function toWords(words: Word[]) {
  return words.map((w) => WORD_BY_ID.get(`${w.art}-${w.noun}`)).filter((w): w is WordWithDay => Boolean(w))
}

export const pluralLabel = (w: Pick<Word, 'plural'>) => (w.plural ? `die ${w.plural}` : '通常不用複數')
