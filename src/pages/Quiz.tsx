import { ArrowRight, Check, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Art, SpeakButton } from '../components/bits'
import { WORD_BY_ID, type WordWithDay } from '../data'
import { addDays, dateKey, shortDate } from '../lib/date'
import { ARTICLES, QTYPE_LABEL, buildQuiz, clozeParts, grade, type QType, type Question, type Verdict } from '../lib/quiz'
import { addQuiz, recordAnswer, useStore, type State } from '../lib/store'
import { pluralLabel, useToday } from '../lib/today'
import { useVocab } from '../lib/vocab'

type Scope = 'today' | 'learning' | 'learned' | 'all' | 'range'
const SCOPE_LABEL: Record<Scope, string> = { today: '今日 10 字', learning: '學習中', learned: '已熟背', all: '單字庫全部', range: '自選日期範圍' }
const TYPES: QType[] = ['article', 'cloze', 'spell', 'plural']
const TYPE_EXAMPLE: Record<QType, string> = {
  article: '___ Prüfung → der / die / das',
  cloze: 'Die ___ endet am 15. März.',
  spell: '獎學金 → das Stipendium',
  plural: 'der Abschluss → die Abschlüsse',
}

type Answered = { q: Question; answer: string; verdict: Verdict }
type Phase = { kind: 'setup' } | { kind: 'play'; questions: Question[]; scope: Scope; quizId: string } | { kind: 'result'; answers: Answered[]; scope: Scope; types: QType[]; quizId: string }

function poolFor(scope: Scope, s: State, todayWords: WordWithDay[], from: string, to: string) {
  const stored = Object.entries(s.words)
  const pick = (pred: (id: string) => boolean) => stored.filter(([id]) => pred(id)).map(([id]) => WORD_BY_ID.get(id)).filter((w): w is WordWithDay => Boolean(w))
  switch (scope) {
    case 'today': return todayWords
    case 'learning': return pick((id) => s.words[id].status === 'learning')
    case 'learned': return pick((id) => s.words[id].status === 'learned')
    case 'all': return pick(() => true)
    case 'range': return pick((id) => s.words[id].addedAt >= from && s.words[id].addedAt <= to)
  }
}

export default function Quiz() {
  const s = useStore()
  const { words: todayWords } = useToday()
  useVocab() // 生活單字載入後重新計算範圍
  const [params] = useSearchParams()
  const initial = (params.get('scope') as Scope) || 'today'
  const [scope, setScope] = useState<Scope>(initial in SCOPE_LABEL ? initial : 'today')
  const [types, setTypes] = useState<QType[]>(['article', 'cloze'])
  const [count, setCount] = useState<number | 'all'>(10)
  const [autoLearning, setAutoLearning] = useState(true)
  const [from, setFrom] = useState(addDays(dateKey(), -7))
  const [to, setTo] = useState(dateKey())
  const [phase, setPhase] = useState<Phase>({ kind: 'setup' })

  const counts = {
    today: 10,
    learning: Object.values(s.words).filter((r) => r.status === 'learning').length,
    learned: Object.values(s.words).filter((r) => r.status === 'learned').length,
    all: Object.keys(s.words).length,
    range: poolFor('range', s, todayWords, from, to).length,
  }
  const pool = poolFor(scope, s, todayWords, from, to)
  const total = count === 'all' ? pool.length : Math.min(count, pool.length)

  function start(words: WordWithDay[], useTypes: QType[], useScope: Scope, n: number) {
    setPhase({ kind: 'play', questions: buildQuiz(words, useTypes, n), scope: useScope, quizId: crypto.randomUUID() })
  }

  function finish(answers: Answered[], useScope: Scope, useTypes: QType[], quizId: string) {
    addQuiz({ id: quizId, date: dateKey(), scope: SCOPE_LABEL[useScope], total: answers.length, correct: answers.filter((a) => a.verdict.ok).length })
    setPhase({ kind: 'result', answers, scope: useScope, types: useTypes, quizId })
  }

  if (phase.kind === 'play') {
    return <Play key={phase.questions.map((q) => q.word.id).join()} questions={phase.questions} quizId={phase.quizId} scopeLabel={SCOPE_LABEL[phase.scope]} autoLearning={autoLearning} onQuit={() => setPhase({ kind: 'setup' })} onDone={(a) => finish(a, phase.scope, types, phase.quizId)} />
  }

  if (phase.kind === 'result') {
    const wrong = phase.answers.filter((a) => !a.verdict.ok)
    return <Result answers={phase.answers} scope={phase.scope} autoLearning={autoLearning} onRetryWrong={() => start(wrong.map((a) => a.q.word), phase.types, phase.scope, wrong.length)} onAgain={() => setPhase({ kind: 'setup' })} />
  }

  const minutes = Math.max(1, Math.round((total * 25) / 60))

  return (
    <div className="grid-2">
      <section className="card" style={{ gap: 24 }} aria-labelledby="quiz-title">
        <div className="stack-sm" style={{ gap: 6 }}>
          <h1 id="quiz-title">自訂測驗</h1>
          <p className="muted">從單字庫挑範圍和題型。答對 3 次的字會自動變成「已熟背」{autoLearning ? '，答錯的字放回「學習中」' : ''}。</p>
        </div>

        <fieldset className="stack-sm" style={{ border: 0, padding: 0, margin: 0 }}>
          <legend><h3>1. 出題範圍</h3></legend>
          <div className="opt-grid" style={{ marginTop: 10 }}>
            {(Object.keys(SCOPE_LABEL) as Scope[]).map((sc) => (
              <button key={sc} type="button" className={`opt${scope === sc ? ' on' : ''}`} onClick={() => setScope(sc)} disabled={sc !== 'today' && sc !== 'range' && counts[sc] === 0} aria-pressed={scope === sc}>
                <span className="tick round" />
                <span className="stack-sm" style={{ gap: 2 }}>
                  <span className="opt-title">{SCOPE_LABEL[sc]} {sc !== 'range' && <span className="xs">· {counts[sc]} 字</span>}</span>
                  <span className="xs">{{ today: '今天這組', learning: '還不熟的字優先', learned: '檢查有沒有忘記', all: '所有標記過的字', range: `${shortDate(from)} – ${shortDate(to)} 加入的 ${counts.range} 字` }[sc]}</span>
                </span>
              </button>
            ))}
          </div>
          {scope === 'range' && (
            <div className="row" style={{ flexWrap: 'wrap' }}>
              <label className="xs" htmlFor="from">從</label>
              <input id="from" type="date" className="input" style={{ width: 170 }} value={from} max={to} onChange={(e) => setFrom(e.target.value)} />
              <label className="xs" htmlFor="to">到</label>
              <input id="to" type="date" className="input" style={{ width: 170 }} value={to} min={from} onChange={(e) => setTo(e.target.value)} />
            </div>
          )}
        </fieldset>

        <fieldset className="stack-sm" style={{ border: 0, padding: 0, margin: 0 }}>
          <legend><h3>2. 題型（可多選）</h3></legend>
          <div className="opt-grid" style={{ marginTop: 10 }}>
            {TYPES.map((t) => {
              const on = types.includes(t)
              return (
                <button key={t} type="button" className={`opt${on ? ' on' : ''}`} aria-pressed={on} onClick={() => setTypes((ts) => (on ? ts.filter((x) => x !== t) : [...ts, t]))}>
                  <span className="tick">{on && <Check size={12} strokeWidth={3} />}</span>
                  <span className="stack-sm" style={{ gap: 2 }}>
                    <span className="opt-title">{QTYPE_LABEL[t]}</span>
                    <span className="xs">{TYPE_EXAMPLE[t]}</span>
                  </span>
                </button>
              )
            })}
          </div>
        </fieldset>

        <div className="between" style={{ flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div className="stack-sm">
            <h3>3. 題數</h3>
            <div className="seg" role="group" aria-label="題數">
              <button className={count === 10 ? 'on' : ''} onClick={() => setCount(10)}>10 題</button>
              <button className={count === 20 ? 'on' : ''} onClick={() => setCount(20)}>20 題</button>
              <button className={count === 'all' ? 'on' : ''} onClick={() => setCount('all')}>全部 {pool.length} 題</button>
            </div>
          </div>
          <div className="row">
            <span className="xs" id="auto-label">答錯自動加入學習中</span>
            <button type="button" role="switch" aria-checked={autoLearning} aria-labelledby="auto-label" className={`switch${autoLearning ? ' on' : ''}`} onClick={() => setAutoLearning((v) => !v)}><i /></button>
          </div>
        </div>
      </section>

      <aside className="stack">
        <div className="card tight">
          <h3>這次的測驗</h3>
          <div className="between"><span className="muted">範圍</span><b>{SCOPE_LABEL[scope]} · {pool.length} 字</b></div>
          <div className="between"><span className="muted">題型</span><b>{types.length ? types.map((t) => QTYPE_LABEL[t]).join('、') : '—'}</b></div>
          <div className="between"><span className="muted">題數</span><b>{total} 題</b></div>
          <div className="between"><span className="muted">預估時間</span><b>約 {minutes} 分鐘</b></div>
          <button type="button" className="btn" disabled={total === 0 || types.length === 0} onClick={() => start(pool, types, scope, total)}>開始測驗</button>
          {total === 0 && <p className="xs">這個範圍還沒有字，先到「每日單字」標記幾個字。</p>}
          {types.length === 0 && <p className="xs">至少選一種題型。</p>}
        </div>
        {s.quizzes.length > 0 && (
          <div className="card tight">
            <h3>最近的測驗</h3>
            {s.quizzes.slice(0, 5).map((q, i) => (
              <div key={i} className="between"><span className="muted">{shortDate(q.date)} · {q.scope}</span><b>{q.correct} / {q.total}</b></div>
            ))}
          </div>
        )}
      </aside>
    </div>
  )
}

/* ---------------- 作答 ---------------- */

const UMLAUTS = ['ä', 'ö', 'ü', 'ß', 'Ä', 'Ö', 'Ü']

function Play({ questions, quizId, scopeLabel, autoLearning, onQuit, onDone }: { questions: Question[]; quizId: string; scopeLabel: string; autoLearning: boolean; onQuit: () => void; onDone: (a: Answered[]) => void }) {
  const [i, setI] = useState(0)
  const [answers, setAnswers] = useState<Answered[]>([])
  const [text, setText] = useState('')
  const [current, setCurrent] = useState<Answered | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const q = questions[i]
  const w = q.word

  useEffect(() => {
    inputRef.current?.focus()
  }, [i])

  function submit(value: string) {
    if (current) return
    const verdict = grade(q, value)
    recordAnswer(w.id, verdict.ok, autoLearning, { quizId, answer: value, type: q.type, scope: scopeLabel })
    const a = { q, answer: value, verdict }
    setCurrent(a)
    setAnswers((arr) => [...arr, a])
  }

  function next() {
    if (i + 1 >= questions.length) {
      onDone(answers)
      return
    }
    setI((n) => n + 1)
    setText('')
    setCurrent(null)
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (current && e.key === 'Enter') {
        e.preventDefault()
        next()
      } else if (!current && q.type === 'article' && ['1', '2', '3'].includes(e.key)) {
        submit(ARTICLES[Number(e.key) - 1])
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  function insert(ch: string) {
    const el = inputRef.current
    if (!el) return setText((t) => t + ch)
    const start = el.selectionStart ?? text.length
    const end = el.selectionEnd ?? text.length
    const nextText = text.slice(0, start) + ch + text.slice(end)
    setText(nextText)
    requestAnimationFrame(() => {
      el.focus()
      el.setSelectionRange(start + ch.length, start + ch.length)
    })
  }

  const [before, after] = clozeParts(w)

  return (
    <div className="narrow stack">
      <div className="between">
        <button type="button" className="btn ghost sm" onClick={onQuit}>結束測驗</button>
        <div className="dots" aria-hidden="true">
          {questions.map((_, n) => <i key={n} className={n < i ? (answers[n]?.verdict.ok ? 'ok' : 'on') : n === i ? 'on' : ''} style={n < i && !answers[n]?.verdict.ok ? { background: 'var(--die)' } : undefined} />)}
        </div>
        <span className="xs">第 {i + 1} / {questions.length} 題</span>
      </div>

      <div className="card" style={{ padding: 36, gap: 22, alignItems: 'center', textAlign: 'center' }}>
        <span className="chip v">{QTYPE_LABEL[q.type]}</span>

        {q.type === 'article' && (
          <>
            <h1 style={{ fontSize: 'clamp(32px, 5vw, 44px)' }}>___ {w.noun}</h1>
            <p className="muted">{w.zh}</p>
            <div className="answers">
              {ARTICLES.map((a, n) => {
                const chosen = current?.answer === a
                const cls = current ? (a === w.art ? 'right' : chosen ? 'wrong' : 'dim') : ''
                return (
                  <button key={a} type="button" className={`answer ${cls}`} disabled={Boolean(current)} onClick={() => submit(a)} aria-label={`${n + 1}：${a}`}>
                    {current && a === w.art && <Check size={20} strokeWidth={3} />}
                    {current && chosen && a !== w.art && <X size={20} strokeWidth={3} />}
                    {a}
                  </button>
                )
              })}
            </div>
          </>
        )}

        {q.type !== 'article' && (
          <>
            {q.type === 'cloze' && (
              <>
                <p className="de" style={{ fontSize: 20, color: 'var(--ink)' }}>{before}<b style={{ color: 'var(--primary)' }}>______</b>{after}</p>
                <p className="zh">{w.deZh}</p>
              </>
            )}
            {q.type === 'spell' && (
              <>
                <h1 style={{ fontSize: 'clamp(28px, 4vw, 36px)' }}>{w.zh}</h1>
                <p className="muted">寫出德文，連冠詞一起（例：die Prüfung）</p>
              </>
            )}
            {q.type === 'plural' && (
              <>
                <h1 style={{ fontSize: 'clamp(28px, 4vw, 36px)' }}>{w.art} {w.noun}</h1>
                <p className="muted">寫出複數形（{w.zh}）</p>
              </>
            )}
            <form className="stack-sm" style={{ width: '100%', maxWidth: 460 }} onSubmit={(e) => { e.preventDefault(); if (current) next(); else if (text.trim()) submit(text) }}>
              <label className="sr-only" htmlFor="quiz-input">你的答案</label>
              <input
                id="quiz-input"
                ref={inputRef}
                className="input"
                style={{ borderRadius: 12, fontSize: 18, textAlign: 'center' }}
                value={text}
                onChange={(e) => setText(e.target.value)}
                readOnly={Boolean(current)}
                autoComplete="off"
                autoCapitalize="off"
                spellCheck={false}
                placeholder={q.type === 'plural' ? 'die …' : q.type === 'spell' ? 'der / die / das + 名詞' : '填入名詞'}
              />
              <div className="umlauts" style={{ justifyContent: 'center', flexWrap: 'wrap' }}>
                {UMLAUTS.map((u) => <button key={u} type="button" className="chip" onClick={() => insert(u)} disabled={Boolean(current)}>{u}</button>)}
              </div>
              {!current && (
                <div className="row" style={{ justifyContent: 'center', flexWrap: 'wrap' }}>
                  <button type="submit" className="btn" disabled={!text.trim()}>送出答案</button>
                  <button type="button" className="btn ghost" onClick={() => submit('')}>跳過</button>
                </div>
              )}
            </form>
          </>
        )}

        {current && (
          <div className={`feedback ${current.verdict.ok ? 'ok' : 'bad'}`} style={{ textAlign: 'left' }} aria-live="polite">
            <span className="title">{current.verdict.ok ? '答對了！' : `正解：${current.verdict.expected}`}</span>
            {current.verdict.note && <span className="zh">{current.verdict.note}</span>}
            <p className="de"><Art art={w.art} /> <b>{w.noun}</b>，{pluralLabel(w)} · {w.zh} <SpeakButton text={`${w.art} ${w.noun}`} /></p>
            <p className="de">{w.de}</p>
          </div>
        )}
      </div>

      {current && (
        <div className="row" style={{ justifyContent: 'center' }}>
          <button type="button" className="btn" style={{ minWidth: 240 }} onClick={next}>{i + 1 >= questions.length ? '看結果' : '下一題'} <ArrowRight size={16} /></button>
        </div>
      )}
      <p className="kbd">{q.type === 'article' ? '鍵盤：1 / 2 / 3 選冠詞 · Enter 下一題' : 'Enter 送出 · 再按 Enter 下一題'}</p>
    </div>
  )
}

/* ---------------- 結果 ---------------- */

function Ring({ value, total }: { value: number; total: number }) {
  const r = 66
  const c = 2 * Math.PI * r
  const pct = total ? value / total : 0
  return (
    <svg width="150" height="150" viewBox="0 0 150 150" role="img" aria-label={`答對 ${value} / ${total}`}>
      <circle cx="75" cy="75" r={r} fill="none" stroke="var(--primary-soft)" strokeWidth="16" />
      <circle cx="75" cy="75" r={r} fill="none" stroke="var(--primary)" strokeWidth="16" strokeLinecap="round" strokeDasharray={`${c * pct} ${c}`} transform="rotate(-90 75 75)" />
      <text x="75" y="80" textAnchor="middle" fontSize="32" fontWeight="700" fill="var(--ink)">{value}/{total}</text>
    </svg>
  )
}

function Result({ answers, scope, autoLearning, onRetryWrong, onAgain }: { answers: Answered[]; scope: Scope; autoLearning: boolean; onRetryWrong: () => void; onAgain: () => void }) {
  const ok = answers.filter((a) => a.verdict.ok).length
  const wrong = answers.filter((a) => !a.verdict.ok)
  const byType = TYPES.map((t) => ({ t, list: answers.filter((a) => a.q.type === t) })).filter((x) => x.list.length)
  const pct = answers.length ? Math.round((ok / answers.length) * 100) : 0
  const headline = pct === 100 ? '全部答對！' : pct >= 80 ? '做得很好！' : pct >= 50 ? '再複習一下就穩了' : '這組字值得再看一輪'

  return (
    <div className="grid-2" style={{ gridTemplateColumns: 'minmax(0, 420px) minmax(0, 1fr)' }}>
      <section className="card" style={{ alignItems: 'center', textAlign: 'center' }}>
        <Ring value={ok} total={answers.length} />
        <h2>{headline}</h2>
        <div className="wrap-row" style={{ justifyContent: 'center' }}>
          <span className="chip">正確率 {pct}%</span>
          <span className="chip">{SCOPE_LABEL[scope]}</span>
        </div>
        <div className="stack-sm" style={{ width: '100%' }}>
          {byType.map(({ t, list }) => (
            <div key={t} className="between"><span className="muted">{QTYPE_LABEL[t]}</span><b>{list.filter((a) => a.verdict.ok).length} / {list.length}</b></div>
          ))}
        </div>
        <div className="stack-sm" style={{ width: '100%' }}>
          {wrong.length > 0 && <button type="button" className="btn" onClick={onRetryWrong}>只重測答錯的 {wrong.length} 題</button>}
          <button type="button" className="btn ghost" onClick={onAgain}>再出一份測驗</button>
          <Link to="/library" className="btn ghost">回到單字庫</Link>
        </div>
      </section>
      <section className="card">
        <div className="between"><h2>答錯的字</h2>{wrong.length > 0 && autoLearning && <span className="status learning">已放回學習中</span>}</div>
        {wrong.length === 0 ? (
          <p className="muted">這次沒有答錯的字。連續答對 3 次的字會自動移到「已熟背」。</p>
        ) : (
          <ul className="word-list" style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {wrong.map(({ q, answer, verdict }, n) => (
              <li key={n} className="word-item">
                <Art art={q.word.art} />
                <div className="word-body">
                  <div className="word-head"><b>{q.word.noun}</b><span className="xs">{q.word.zh} · {QTYPE_LABEL[q.type]}</span></div>
                  <p className="zh">你答：{answer || '（跳過）'} · 正解：<b style={{ color: 'var(--ok)' }}>{verdict.expected}</b>{verdict.note ? `（${verdict.note}）` : ''}</p>
                  <p className="de">{q.word.de}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
        <div className="note"><p className="zh">想再練這些字：出測驗時範圍選「學習中」。連續答對 3 次就會移到「已熟背」。</p></div>
      </section>
    </div>
  )
}
