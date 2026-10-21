import { Flame } from 'lucide-react'
import { Link } from 'react-router-dom'
import { wordId } from '../data'
import { streakDays, useStore } from '../lib/store'
import { useToday } from '../lib/today'

export default function Done() {
  const s = useStore()
  const { index, day } = useToday()
  const learnedToday = day.words.filter((w) => s.words[wordId(w)]?.status === 'learned').length
  const learnedAll = Object.values(s.words).filter((r) => r.status === 'learned').length
  const all = learnedToday === 10

  return (
    <div className="card empty" style={{ maxWidth: 640, margin: '24px auto 0', gap: 20 }}>
      <img src={`${import.meta.env.BASE_URL}pretzel.png`} alt="" width={96} height={96} style={{ imageRendering: 'pixelated' }} />
      <h1>{all ? '今天的 10 個字都記住了！' : `今天已經記住 ${learnedToday} 個字`}</h1>
      <p className="muted">{day.theme} · 第 {index + 1} 組。明天會換一組新的字，學習中的字會在測驗裡再出現。</p>
      <div className="stats" style={{ gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', width: '100%' }}>
        <div className="stat" style={{ background: 'var(--primary-soft-2)' }}><span className="xs">今日完成</span><b>{learnedToday} / 10</b></div>
        <div className="stat" style={{ background: 'var(--amber-soft)' }}><span className="xs row" style={{ gap: 4 }}><Flame size={14} color="#F59E0B" fill="#F59E0B" />連續天數</span><b>{streakDays(s)} 天</b></div>
        <div className="stat" style={{ background: 'var(--ok-soft)' }}><span className="xs">單字庫已熟背</span><b>{learnedAll} 字</b></div>
      </div>
      <div className="stack-sm" style={{ width: '100%' }}>
        <Link to="/quiz?scope=today" className="btn block">測驗今天的 10 個字</Link>
        <Link to="/daily/grammar" className="btn ghost block">複習今日句型</Link>
      </div>
      <p className="xs">已熟背的字會自動存進「單字庫」</p>
    </div>
  )
}
