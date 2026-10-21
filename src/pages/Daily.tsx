import { Check, Flame } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Art, Markup, SpeakButton } from '../components/bits'
import { Segmented } from '../components/Sliding'
import { wordId } from '../data'
import { prettyDate, thisWeek } from '../lib/date'
import { markWord, setTrack, streakDays, useStore } from '../lib/store'
import { pluralLabel, useToday } from '../lib/today'
import { useVocab } from '../lib/vocab'

const WEEK_LABELS = ['一', '二', '三', '四', '五', '六', '日']

export default function Daily() {
  const s = useStore()
  const { key, index, total, day, track, pending } = useToday()
  const vocab = useVocab()
  const lifeCount = vocab.kind === 'ready' ? vocab.words.length : 0
  const learnedToday = day.words.filter((w) => s.words[wordId(w)]?.status === 'learned').length
  const learnedAll = Object.values(s.words).filter((r) => r.status === 'learned').length
  const learningAll = Object.values(s.words).filter((r) => r.status === 'learning').length
  const streak = streakDays(s)
  const week = thisWeek(key)
  const g = day.grammar

  return (
    <div className="grid-2">
      <section className="card" aria-labelledby="daily-title">
        <div style={{ alignSelf: 'flex-start' }}>
          <Segmented
            label="單字庫"
            value={pending ? 'life' : track}
            onChange={setTrack}
            options={[
              { value: 'life', label: `生活常用${lifeCount ? ` ${lifeCount.toLocaleString('en-US')} 字` : ''}` },
              { value: 'academic', label: 'B1 學術 200 字' },
            ]}
          />
        </div>
        <div className="between" style={{ alignItems: 'flex-start' }}>
          <div className="stack-sm" style={{ gap: 6 }}>
            <p className="xs">{prettyDate(key)} · 第 {index + 1} / {total} 組</p>
            <h1 id="daily-title">今日 10 字：{day.theme}</h1>
          </div>
          <span className="chip v">{track === 'life' ? 'A1–B1 生活' : 'B1 學術／課堂'}</span>
        </div>
        {pending && <p className="xs">生活單字載入中，先顯示 B1 學術這組…</p>}
        {vocab.kind === 'error' && track !== 'academic' && <p className="xs" style={{ color: 'var(--bad)' }}>生活單字載入失敗，先顯示 B1 學術這組。</p>}
        <div className="stack-sm" style={{ gap: 8 }}>
          <div className="between">
            <span className="xs">今日進度</span>
            <span className="xs"><b style={{ color: 'var(--primary)' }}>{learnedToday}</b> / 10 記住了</span>
          </div>
          <div className="bar" role="progressbar" aria-valuemin={0} aria-valuemax={10} aria-valuenow={learnedToday} aria-label="今日進度">
            <i style={{ width: `${learnedToday * 10}%` }} />
          </div>
        </div>
        <ul className="word-list" style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {day.words.map((w) => {
            const id = wordId(w)
            const st = s.words[id]?.status
            return (
              <li key={id} className="word-item">
                <Art art={w.art} />
                <div className="word-body">
                  <div className="word-head">
                    <b>{w.noun}</b>
                    <SpeakButton text={`${w.art} ${w.noun}`} />
                    <span className="xs">{pluralLabel(w)}</span>
                    <span className="xs">·</span>
                    <span className="xs">{w.zh}</span>
                  </div>
                  <p className="de">{w.de} <SpeakButton text={w.de} label="朗讀例句" /></p>
                  <p className="zh">{w.deZh}</p>
                </div>
                {st === 'learned' ? (
                  <button type="button" className="mark learned" onClick={() => markWord(id, 'learning')} title="點一下改回學習中">
                    <Check size={14} strokeWidth={3} />記住了
                  </button>
                ) : (
                  <button type="button" className={`mark ${st === 'learning' ? 'learning' : 'todo'}`} onClick={() => markWord(id, 'learned')}>
                    {st === 'learning' ? '學習中' : '標記已背'}
                  </button>
                )}
              </li>
            )
          })}
        </ul>
        {learnedToday === 10 && <Link to="/daily/done" className="btn">今天完成了，看看成果 →</Link>}
      </section>

      <aside className="stack">
        <div className="card tight">
          <div className="between"><h3>今日句型</h3><span className="chip amber">B1 · {g.meaning}</span></div>
          <div className="pattern">
            {g.blocks.slice(0, 3).map((b, i) => <span key={i} className={`pb ${b.tone}`}>{b.text}</span>)}
          </div>
          <p className="de"><Markup text={g.examples[0].de} /></p>
          <p className="zh">{g.examples[0].zh}</p>
          <Link to="/daily/grammar" className="btn ghost sm">看完整句型：{g.title} →</Link>
        </div>
        <div className="card tight">
          <div className="row"><Flame size={18} color="#F59E0B" fill="#F59E0B" /><h3>連續學習 {streak} 天</h3></div>
          <div className="week" aria-label="本週學習紀錄">
            {week.map((d, i) => (
              <span key={d} className={`${s.activity.includes(d) ? 'on' : ''} ${d === key ? 'today' : ''}`} title={d}>{WEEK_LABELS[i]}</span>
            ))}
          </div>
          <p className="xs">單字庫已熟背 {learnedAll} 字 · 學習中 {learningAll} 字</p>
        </div>
        <Link to="/daily/cards" className="btn block">開始學習卡</Link>
        <Link to="/quiz?scope=today" className="btn ghost block">測驗今天的 10 個字</Link>
      </aside>
    </div>
  )
}
