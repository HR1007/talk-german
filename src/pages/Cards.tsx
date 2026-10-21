import { ArrowLeft, Check, RotateCcw } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { Art, SpeakButton } from '../components/bits'
import { wordId } from '../data'
import { articleHint } from '../lib/hints'
import { speak } from '../lib/speech'
import { markWord, useStore } from '../lib/store'
import { useToday } from '../lib/today'

export default function Cards() {
  const s = useStore()
  const { day } = useToday()
  // round 0：今天全部 10 個字；之後每一輪只放還沒記住的字
  const [round, setRound] = useState(0)
  const deck = useMemo(
    () => (round > 0 ? day.words.filter((w) => s.words[wordId(w)]?.status !== 'learned') : day.words),
    // 只在開新一輪時重排；學習途中標記不要讓牌堆跳動，所以刻意不把 s 放進依賴
    [day, round],
  )
  const [i, setI] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const finished = i >= deck.length
  const w = deck[Math.min(i, deck.length - 1)]

  const answer = useCallback(
    (learned: boolean) => {
      if (finished || !w) return
      markWord(wordId(w), learned ? 'learned' : 'learning')
      setFlipped(false)
      setI((n) => n + 1)
    },
    [finished, w],
  )

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
      if (e.key === ' ') {
        e.preventDefault()
        setFlipped((f) => !f)
      } else if (e.key === 'ArrowRight') answer(true)
      else if (e.key === 'ArrowLeft') answer(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [answer])

  const learnedToday = day.words.filter((x) => s.words[wordId(x)]?.status === 'learned').length

  if (finished || !w) {
    const left = 10 - learnedToday
    if (left === 0) return <Navigate to="/daily/done" replace />
    return (
      <div className="narrow">
        <div className="card empty">
          <h2>這一輪看完了</h2>
          <p className="muted">今天還有 {left} 個字在「學習中」，再看一輪會記得更牢。</p>
          <div className="row" style={{ justifyContent: 'center', flexWrap: 'wrap' }}>
            <button className="btn" type="button" onClick={() => { setRound((r) => r + 1); setI(0) }}><RotateCcw size={16} />只看還不熟的字</button>
            <Link to="/daily" className="btn ghost">回列表</Link>
          </div>
        </div>
      </div>
    )
  }

  const hint = articleHint(w.noun, w.art)

  return (
    <div className="narrow stack">
      <div className="between">
        <Link to="/daily" className="btn ghost sm"><ArrowLeft size={14} />回列表</Link>
        <div className="dots" aria-hidden="true">
          {deck.map((x, n) => <i key={wordId(x)} className={n < i ? 'ok' : n === i ? 'on' : ''} />)}
        </div>
        <span className="xs">{i + 1} / {deck.length}</span>
      </div>

      <div
        className="card flash"
        role="button"
        tabIndex={0}
        aria-label={flipped ? '翻回正面' : '翻到背面看中文與例句'}
        onClick={() => setFlipped((f) => !f)}
        onKeyDown={(e) => { if (e.key === 'Enter') setFlipped((f) => !f) }}
      >
        <span className="xs">{flipped ? '點卡片翻回正面' : '先想想看意思，再點卡片翻面'}</span>
        <div className="row" style={{ gap: 14, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Art art={w.art} big />
          <h1>{w.noun}</h1>
        </div>
        <div className="wrap-row" style={{ justifyContent: 'center' }}>
          <span className="chip">{w.plural ? `複數 die ${w.plural}` : '通常不用複數'}</span>
          <button type="button" className="chip v" onClick={(e) => { e.stopPropagation(); speak(`${w.art} ${w.noun}`) }}>聽發音</button>
        </div>
        {flipped && (
          <>
            <h2 style={{ color: 'var(--primary)' }}>{w.zh}</h2>
            <div className="note" style={{ width: '100%', maxWidth: 620, textAlign: 'left' }}>
              <p className="de">{w.de} <SpeakButton text={w.de} label="朗讀例句" /></p>
              <p className="zh">{w.deZh}</p>
            </div>
            {hint && <p className="xs">記憶提示：{hint}</p>}
          </>
        )}
      </div>

      <div className="row" style={{ justifyContent: 'center', flexWrap: 'wrap', gap: 16 }}>
        <button type="button" className="btn ghost" style={{ minWidth: 200 }} onClick={() => answer(false)}>還不熟，晚點再看</button>
        <button type="button" className="btn" style={{ minWidth: 200 }} onClick={() => answer(true)}><Check size={16} strokeWidth={3} />記住了</button>
      </div>
      <p className="kbd">鍵盤：空白鍵翻卡 · ← 還不熟 · → 記住了</p>
    </div>
  )
}
