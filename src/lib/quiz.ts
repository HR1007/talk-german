import type { Article } from '../data/types'
import type { WordWithDay } from '../data'

export type QType = 'article' | 'cloze' | 'spell' | 'plural'

export const QTYPE_LABEL: Record<QType, string> = {
  article: '冠詞選擇',
  cloze: '例句填空',
  spell: '中翻德拼寫',
  plural: '複數形',
}

export type Question = { word: WordWithDay; type: QType }

function shuffle<T>(arr: T[]) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

/** 每個字出一題，題型輪流分配；字不夠題數時不重複出題 */
export function buildQuiz(pool: WordWithDay[], types: QType[], count: number): Question[] {
  // 只選了「複數形」時，不可數名詞（plural 為空）整個排除
  const usable = types.length === 1 && types[0] === 'plural' ? pool.filter((w) => w.plural) : pool
  const words = shuffle(usable).slice(0, Math.min(count, usable.length))
  const order = shuffle(types)
  return words.map((word, i) => {
    let type = order[i % order.length]
    // 不可數名詞輪到複數題時，換成其他題型
    if (type === 'plural' && !word.plural) type = order.find((t) => t !== 'plural') ?? 'article'
    return { word, type }
  })
}

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/** 例句填空：把名詞挖掉（只挖完整的字，不會挖到複合字裡的一部分） */
export function clozeParts(w: WordWithDay): [string, string] {
  const re = new RegExp(`(^|[^\\p{L}])${escapeRe(w.noun)}(?=[^\\p{L}]|$)`, 'u')
  const m = w.de.match(re)
  if (!m || m.index === undefined) return [w.de + ' ', '']
  const start = m.index + m[1].length
  return [w.de.slice(0, start), w.de.slice(start + w.noun.length)]
}

const norm = (s: string) => s.normalize('NFC').trim().replace(/\s+/g, ' ')

export type Verdict = { ok: boolean; expected: string; note?: string }

export function grade(q: Question, answer: string): Verdict {
  const w = q.word
  const a = norm(answer)
  switch (q.type) {
    case 'article':
      return { ok: a === w.art, expected: `${w.art} ${w.noun}` }
    case 'cloze': {
      if (a === w.noun) return { ok: true, expected: w.noun }
      const caseOnly = a.toLowerCase() === w.noun.toLowerCase()
      return { ok: false, expected: w.noun, note: caseOnly ? '德文名詞第一個字母要大寫' : undefined }
    }
    case 'spell': {
      const expected = `${w.art} ${w.noun}`
      if (a === expected) return { ok: true, expected }
      const [art, ...rest] = a.split(' ')
      const noun = rest.join(' ')
      if (noun === w.noun && art !== w.art) return { ok: false, expected, note: `名詞對了，冠詞應該是 ${w.art}` }
      if (a === w.noun) return { ok: false, expected, note: '記得連冠詞一起寫' }
      if (a.toLowerCase() === expected.toLowerCase()) return { ok: false, expected, note: '德文名詞第一個字母要大寫' }
      return { ok: false, expected }
    }
    case 'plural': {
      const expected = `die ${w.plural}`
      const plural = a.replace(/^die\s+/, '')
      if (plural === w.plural) return { ok: true, expected }
      if (plural.toLowerCase() === w.plural.toLowerCase()) return { ok: false, expected, note: '德文名詞第一個字母要大寫' }
      return { ok: false, expected }
    }
  }
}

export const ARTICLES: Article[] = ['der', 'die', 'das']
