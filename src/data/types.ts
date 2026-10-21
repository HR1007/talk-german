export type Article = 'der' | 'die' | 'das'

export type Word = {
  art: Article
  noun: string
  /** 複數形，不含冠詞（複數冠詞一律是 die）；不可數名詞為空字串 */
  plural: string
  zh: string
  /** 例句：一定要包含 noun 本身，測驗的「例句填空」靠它挖空 */
  de: string
  deZh: string
}

export type Tone = 'a' | 'b' | 'c' | 'd'

/**
 * 例句裡的標記：
 *   [[...]] 句型關鍵字（紫）
 *   {{...}} 句型第二關鍵字（琥珀）
 *   **...** 當天的單字（粗體）
 */
export type Example = { de: string; zh: string }

export type Grammar = {
  title: string
  meaning: string
  summary: string
  blocks: { label: string; text: string; tone: Tone }[]
  blocksZh: string
  examples: Example[]
  notes: string[]
  /** 重組練習：answer 依正確順序排列，畫面上會打散 */
  exercise: { zh: string; answer: string[] }
}

export type Day = {
  theme: string
  words: Word[]
  grammar: Grammar
}
