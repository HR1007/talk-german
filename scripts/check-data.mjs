// 檢查單字庫：每天 10 個字、名詞不重複、例句一定包含該名詞（例句填空靠它挖空）、
// 重組練習的答案至少 3 塊。用 Vite 的 TS 轉譯器直接讀 .ts 檔，不另外編譯。
import { createServer } from 'vite'

const server = await createServer({ server: { middlewareMode: true }, appType: 'custom', logLevel: 'silent' })
const { DAYS } = await server.ssrLoadModule('/src/data/index.ts')
await server.close()

const errors = []
const seen = new Map()
const wordRe = (noun) => new RegExp(`(^|[^\\p{L}])${noun}([^\\p{L}]|$)`, 'u')

DAYS.forEach((d, i) => {
  if (d.words.length !== 10) errors.push(`第 ${i + 1} 天有 ${d.words.length} 個字`)
  d.words.forEach((w) => {
    if (!['der', 'die', 'das'].includes(w.art)) errors.push(`${w.noun}：冠詞錯誤 ${w.art}`)
    if (seen.has(w.noun)) errors.push(`${w.noun} 重複（第 ${seen.get(w.noun)} 天與第 ${i + 1} 天）`)
    seen.set(w.noun, i + 1)
    if (!wordRe(w.noun).test(w.de)) errors.push(`第 ${i + 1} 天 ${w.noun}：例句沒有包含名詞本身 →「${w.de}」`)
    if (!w.plural || !w.zh || !w.deZh) errors.push(`${w.noun}：缺少複數、中文或例句翻譯`)
  })
  const g = d.grammar
  if (g.examples.length < 3) errors.push(`第 ${i + 1} 天句型例句少於 3 句`)
  if (g.exercise.answer.length < 3) errors.push(`第 ${i + 1} 天重組練習少於 3 塊`)
})

console.log(`${DAYS.length} 天、${seen.size} 個字`)
if (errors.length) {
  console.error(errors.join('\n'))
  process.exit(1)
}
console.log('單字庫檢查通過')
