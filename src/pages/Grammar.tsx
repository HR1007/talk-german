import { ArrowLeft, Check, RotateCcw, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Markup, SpeakButton, plain } from '../components/bits'
import { useToday } from '../lib/today'

/** 固定種子的洗牌：同一天每次打開順序一樣，而且保證不是原本的正確順序 */
function seededShuffle<T>(arr: T[], seed: number) {
  const a = arr.map((v, i) => ({ v, i }))
  let x = seed * 9301 + 49297
  for (let i = a.length - 1; i > 0; i--) {
    x = (x * 9301 + 49297) % 233280
    const j = Math.floor((x / 233280) * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  if (a.every((t, i) => t.i === i)) a.push(a.shift()!)
  return a
}

export default function GrammarPage() {
  const { index, day, track } = useToday()
  const g = day.grammar
  const tokens = useMemo(() => seededShuffle(g.exercise.answer, index + 1), [g, index])
  const [picked, setPicked] = useState<number[]>([])
  const [result, setResult] = useState<'ok' | 'bad' | 'shown' | null>(null)

  const built = picked.map((p) => tokens[p].v)
  const complete = picked.length === tokens.length

  function check() {
    setResult(built.join(' ') === g.exercise.answer.join(' ') ? 'ok' : 'bad')
  }

  function reset() {
    setPicked([])
    setResult(null)
  }

  return (
    <div className="grid-2">
      <section className="card" aria-labelledby="grammar-title">
        <Link to="/daily" className="btn ghost sm" style={{ alignSelf: 'flex-start' }}><ArrowLeft size={14} />回今日 10 字</Link>
        <div className="stack-sm" style={{ gap: 6 }}>
          <p className="xs">{track === 'life' ? '今日句型 · B1 常用句型輪流練習' : '今日句型 · 和今天的單字一起用'}</p>
          <h1 id="grammar-title">{g.title}：{g.meaning}</h1>
          <p className="muted">{g.summary}</p>
        </div>

        <div className="stack-sm">
          <h3>句子結構</h3>
          <div className="pattern">
            {g.blocks.map((b, i) => (
              <span key={i} className={`pb ${b.tone}`}><small>{b.label}</small>{b.text}</span>
            ))}
          </div>
          <div className="row">
            <p className="zh">{g.blocksZh}</p>
            <SpeakButton text={g.blocks.map((b) => b.text).join(' ')} label="朗讀例句" />
          </div>
        </div>

        <div className="stack-sm">
          <h3>{track === 'life' ? '例句' : '用今天的單字造句'}</h3>
          {g.examples.map((ex, i) => (
            <div key={i} className="note">
              <p className="de"><Markup text={ex.de} /> <SpeakButton text={plain(ex.de)} label="朗讀例句" /></p>
              <p className="zh">{ex.zh}</p>
            </div>
          ))}
        </div>

        <div className="stack-sm">
          <h3>注意</h3>
          {g.notes.map((n, i) => <p key={i} className="muted">・{n}</p>)}
        </div>
      </section>

      <aside className="stack">
        <div className="card tight">
          <h3>小練習：重組句子</h3>
          <p className="zh">{g.exercise.zh}</p>
          <p className="xs">依序點下面的詞塊，組成正確的德文句子。</p>
          <div className="tokens">
            {tokens.map((t, i) => (
              <button
                key={i}
                type="button"
                className={`token${picked.includes(i) ? ' used' : ''}`}
                disabled={picked.includes(i) || result === 'ok' || result === 'shown'}
                onClick={() => { setPicked((p) => [...p, i]); setResult(null) }}
              >
                {t.v}
              </button>
            ))}
          </div>
          <div className="answer-line" aria-live="polite">
            {picked.length === 0 && <span className="xs">點詞塊放到這裡</span>}
            {picked.map((p, n) => (
              <button
                key={p}
                type="button"
                className="token"
                title="點一下拿掉"
                disabled={result === 'ok' || result === 'shown'}
                onClick={() => { setPicked((arr) => arr.filter((_, k) => k !== n)); setResult(null) }}
              >
                {tokens[p].v}
              </button>
            ))}
          </div>
          {result === 'ok' && <div className="feedback ok"><span className="title"><Check size={14} /> 完全正確！</span></div>}
          {result === 'bad' && <div className="feedback bad"><span className="title"><X size={14} /> 順序還不對</span><span className="zh">提示：注意動詞要放在第幾位。</span></div>}
          {result === 'shown' && <div className="note"><span className="xs">解答</span><p className="de">{g.exercise.answer.join(' ')}</p></div>}
          <div className="row" style={{ flexWrap: 'wrap' }}>
            <button type="button" className="btn sm" disabled={!complete || result === 'ok'} onClick={check}>檢查答案</button>
            <button type="button" className="btn ghost sm" onClick={() => setResult('shown')}>看解答</button>
            {(picked.length > 0 || result) && <button type="button" className="btn ghost sm" onClick={reset}><RotateCcw size={14} />重來</button>}
          </div>
        </div>
        <Link to="/daily/cards" className="btn block">用學習卡複習今天的字</Link>
      </aside>
    </div>
  )
}
