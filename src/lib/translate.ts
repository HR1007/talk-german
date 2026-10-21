/**
 * 德文 → 繁體中文。用 MyMemory 的免費 API（允許瀏覽器直接呼叫，不需金鑰）。
 * 單次上限約 500 字元，所以長文依句子切段再合併。
 */
const ENDPOINT = 'https://api.mymemory.translated.net/get'
const LIMIT = 450

function chunks(text: string) {
  const sentences = text.replace(/\s+/g, ' ').trim().match(/[^.!?]+[.!?]*/g) ?? [text]
  const out: string[] = []
  let cur = ''
  for (const s of sentences) {
    if ((cur + s).length > LIMIT && cur) {
      out.push(cur.trim())
      cur = ''
    }
    cur += s
  }
  if (cur.trim()) out.push(cur.trim())
  return out
}

export class TranslateError extends Error {}

export async function translateDeToZh(text: string, signal?: AbortSignal) {
  const parts = chunks(text)
  const results: string[] = []
  for (const part of parts) {
    const url = `${ENDPOINT}?q=${encodeURIComponent(part)}&langpair=de|zh-TW`
    // 15 秒沒回應就放棄，避免畫面一直停在「翻譯中」
    const timeout = AbortSignal.timeout(15_000)
    const combined = signal && 'any' in AbortSignal ? AbortSignal.any([signal, timeout]) : (signal ?? timeout)
    let res: Response
    try {
      res = await fetch(url, { signal: combined })
    } catch (e) {
      if (timeout.aborted && !signal?.aborted) throw new TranslateError('翻譯服務回應太慢，請再試一次。')
      throw e
    }
    if (!res.ok) throw new TranslateError('翻譯服務暫時沒有回應，請稍後再試。')
    const data = (await res.json()) as { responseStatus: number; responseData?: { translatedText?: string }; quotaFinished?: boolean }
    if (data.quotaFinished) throw new TranslateError('今天的免費翻譯額度用完了，明天再試。')
    if (data.responseStatus !== 200 || !data.responseData?.translatedText) throw new TranslateError('翻譯失敗，請再試一次。')
    results.push(data.responseData.translatedText)
  }
  return results.join('')
}
