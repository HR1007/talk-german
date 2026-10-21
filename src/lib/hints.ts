import type { Article } from '../data/types'

/** 常見的詞尾性別規則。只在規則和這個字的實際冠詞一致時才顯示，避免誤導。 */
const RULES: { end: string; art: Article; text: string }[] = [
  { end: 'ung', art: 'die', text: '-ung 結尾的名詞都是陰性（die）' },
  { end: 'heit', art: 'die', text: '-heit 結尾的名詞都是陰性（die）' },
  { end: 'keit', art: 'die', text: '-keit 結尾的名詞都是陰性（die）' },
  { end: 'schaft', art: 'die', text: '-schaft 結尾的名詞都是陰性（die）' },
  { end: 'ion', art: 'die', text: '-ion 結尾的名詞幾乎都是陰性（die）' },
  { end: 'ie', art: 'die', text: '-ie 結尾的名詞多半是陰性（die）' },
  { end: 'ik', art: 'die', text: '-ik 結尾的名詞多半是陰性（die）' },
  { end: 'nis', art: 'das', text: '-nis 結尾的名詞多半是中性（das），複數加 -se' },
  { end: 'um', art: 'das', text: '-um 結尾的外來字是中性（das）' },
  { end: 'ment', art: 'das', text: '-ment 結尾的外來字是中性（das）' },
  { end: 'at', art: 'das', text: '-at 結尾的外來字多半是中性（das）' },
]

const COMPOUND_HEADS: Record<string, Article> = { arbeit: 'die', vertrag: 'der', erlaubnis: 'die', ausweis: 'der', gespräch: 'das', semester: 'das', ticket: 'das', versicherung: 'die', ordnung: 'die', verzeichnis: 'das' }

export function articleHint(noun: string, art: Article) {
  const lower = noun.toLowerCase()
  for (const [head, headArt] of Object.entries(COMPOUND_HEADS)) {
    if (lower.endsWith(head) && lower !== head && headArt === art) {
      const h = head[0].toUpperCase() + head.slice(1)
      return `複合名詞看最後一個字：${art} ${h} → ${art} ${noun}`
    }
  }
  const rule = RULES.find((r) => lower.endsWith(r.end))
  return rule && rule.art === art ? rule.text : null
}
