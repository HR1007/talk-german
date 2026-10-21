import { Search, Trash2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Art, SpeakButton } from '../components/bits'
import { Segmented } from '../components/Sliding'
import { WORD_BY_ID } from '../data'
import type { Article } from '../data/types'
import { shortDate } from '../lib/date'
import { useSync } from '../lib/cloud'
import { accuracy, markWord, removeWord, resetAll, useStore, type Status } from '../lib/store'
import { pluralLabel } from '../lib/today'
import { useVocab } from '../lib/vocab'

type StatusFilter = 'all' | Status
type Sort = 'recent' | 'alpha' | 'weak'

export default function LibraryPage() {
  const s = useStore()
  const vocab = useVocab() // 生活單字載入後要重算（字表才認得那些 id）
  const sync = useSync()
  const signedIn = sync.kind === 'synced' || sync.kind === 'syncing' || sync.kind === 'error'
  const [q, setQ] = useState('')
  const [status, setStatus] = useState<StatusFilter>('all')
  const [art, setArt] = useState<Article | 'all'>('all')
  const [sort, setSort] = useState<Sort>('recent')
  const [confirmReset, setConfirmReset] = useState(false)

  const entries = useMemo(
    () =>
      Object.entries(s.words)
        .map(([id, r]) => ({ id, r, w: WORD_BY_ID.get(id) }))
        .filter((e): e is { id: string; r: typeof e.r; w: NonNullable<typeof e.w> } => Boolean(e.w)),
    // eslint 不在這個專案；vocab 只用來在字表載入後觸發重算
    [s.words, vocab],
  )
  const learned = entries.filter((e) => e.r.status === 'learned').length
  const learning = entries.length - learned
  const thisWeek = entries.filter((e) => Date.now() - new Date(e.r.addedAt).getTime() < 7 * 86_400_000).length
  const artStats = (['der', 'die', 'das'] as Article[]).map((a) => {
    const rs = entries.filter((e) => e.w.art === a)
    const c = rs.reduce((n, e) => n + e.r.correct, 0)
    const t = rs.reduce((n, e) => n + e.r.correct + e.r.wrong, 0)
    return { a, c, t }
  })
  const totalC = artStats.reduce((n, x) => n + x.c, 0)
  const totalT = artStats.reduce((n, x) => n + x.t, 0)

  const query = q.trim().toLowerCase()
  const rows = entries
    .filter((e) => status === 'all' || e.r.status === status)
    .filter((e) => art === 'all' || e.w.art === art)
    .filter((e) => !query || e.w.noun.toLowerCase().includes(query) || e.w.zh.includes(q.trim()) || e.w.plural.toLowerCase().includes(query))
    .sort((a, b) => {
      if (sort === 'alpha') return a.w.noun.localeCompare(b.w.noun, 'de')
      if (sort === 'weak') return (accuracy(a.r) ?? 101) - (accuracy(b.r) ?? 101)
      return b.r.addedAt.localeCompare(a.r.addedAt) || a.w.noun.localeCompare(b.w.noun, 'de')
    })

  const quizScope = status === 'learned' ? 'learned' : status === 'learning' ? 'learning' : 'all'

  if (entries.length === 0) {
    return (
      <div className="card empty" style={{ maxWidth: 640, margin: '24px auto 0' }}>
        <h1>單字庫還是空的</h1>
        <p className="muted">在「每日單字」把字標記為「記住了」或「還不熟」，就會存進這裡。</p>
        <Link to="/daily" className="btn">去看今天的 10 個字</Link>
      </div>
    )
  }

  return (
    <div className="stack">
      <div className="between" style={{ flexWrap: 'wrap' }}>
        <div className="stack-sm" style={{ gap: 6 }}>
          <h1>我的單字庫</h1>
          <p className="muted">每天標記過的字都存在這裡{signedIn ? '並同步到雲端' : ''}，可以挑一部分出來自訂測驗。</p>
        </div>
        <Link to={`/quiz?scope=${quizScope}`} className="btn">用這些字出測驗</Link>
      </div>

      <div className="stats">
        <div className="stat"><span className="xs">已熟背</span><b>{learned}</b><span className="xs" style={{ color: 'var(--ok)' }}>連續答對 3 次自動加入</span></div>
        <div className="stat"><span className="xs">學習中</span><b>{learning}</b><span className="xs">測驗答錯會自動放回這裡</span></div>
        <div className="stat"><span className="xs">本週新增</span><b>{thisWeek}</b><span className="xs">共 {entries.length} 字</span></div>
        <div className="stat"><span className="xs">冠詞與拼寫正確率</span><b>{totalT ? `${Math.round((totalC / totalT) * 100)}%` : '—'}</b><span className="xs">{totalT ? artStats.map((x) => `${x.a} ${x.t ? Math.round((x.c / x.t) * 100) + '%' : '—'}`).join(' · ') : '做過測驗後顯示'}</span></div>
      </div>

      <div className="card" style={{ gap: 14 }}>
        <div className="between" style={{ flexWrap: 'wrap' }}>
          <label className="search" style={{ flex: '1 1 260px', maxWidth: 340 }}>
            <span className="sr-only">搜尋單字</span>
            <Search size={16} />
            <input className="input" placeholder="搜尋德文或中文" value={q} onChange={(e) => setQ(e.target.value)} />
          </label>
          <div className="wrap-row">
            <Segmented
              label="狀態"
              value={status}
              onChange={setStatus}
              options={[
                { value: 'all', label: `全部 ${entries.length}` },
                { value: 'learned', label: `已熟背 ${learned}` },
                { value: 'learning', label: `學習中 ${learning}` },
              ]}
            />
            <Segmented
              label="冠詞"
              value={art}
              onChange={setArt}
              options={(['all', 'der', 'die', 'das'] as const).map((a) => ({ value: a, label: a === 'all' ? '所有冠詞' : a }))}
            />
            <Segmented
              label="排序"
              value={sort}
              onChange={setSort}
              options={[
                { value: 'recent', label: '最新' },
                { value: 'alpha', label: 'A–Z' },
                { value: 'weak', label: '最弱' },
              ]}
            />
          </div>
        </div>

        <div className="table-scroll">
          <table className="table">
            <thead>
              <tr><th>冠詞</th><th>單字</th><th>中文</th><th>狀態</th><th>加入</th><th>正確率</th><th><span className="sr-only">操作</span></th></tr>
            </thead>
            <tbody>
              {rows.map(({ id, r, w }) => {
                const acc = accuracy(r)
                return (
                  <tr key={id}>
                    <td><Art art={w.art} /></td>
                    <td><span className="noun">{w.noun}</span> <SpeakButton text={`${w.art} ${w.noun}`} /><div className="xs">{pluralLabel(w)}</div></td>
                    <td className="muted">{w.zh}</td>
                    <td><span className={`status ${r.status}`}>{r.status === 'learned' ? '已熟背' : '學習中'}</span></td>
                    <td className="xs">{shortDate(r.addedAt)}</td>
                    <td className="xs">{acc === null ? '—' : `${acc}%`}{r.correct + r.wrong > 0 && <span> （{r.correct}/{r.correct + r.wrong}）</span>}</td>
                    <td>
                      <div className="row" style={{ gap: 6, justifyContent: 'flex-end' }}>
                        <button type="button" className="btn ghost sm" onClick={() => markWord(id, r.status === 'learned' ? 'learning' : 'learned')}>
                          {r.status === 'learned' ? '移回學習中' : '標記熟背'}
                        </button>
                        <button type="button" className="speak" onClick={() => removeWord(id)} aria-label={`從單字庫移除 ${w.noun}`} title="從單字庫移除"><Trash2 size={16} /></button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {rows.length === 0 && <p className="muted" style={{ padding: 16, textAlign: 'center' }}>沒有符合條件的字。</p>}
        </div>
        <p className="xs">顯示 {rows.length} / {entries.length} 字 · {signedIn ? '已登入，紀錄會同步到雲端。' : <>資料只存在這個瀏覽器，<Link to="/account">登入</Link>後可以同步到其他裝置。</>}</p>
      </div>

      <div className="row" style={{ justifyContent: 'flex-end' }}>
        {confirmReset ? (
          <>
            <span className="xs">確定要清除所有單字與測驗紀錄？</span>
            <button type="button" className="btn sm" style={{ background: 'var(--die)' }} onClick={() => { resetAll(); setConfirmReset(false) }}>清除</button>
            <button type="button" className="btn ghost sm" onClick={() => setConfirmReset(false)}>取消</button>
          </>
        ) : (
          <button type="button" className="btn ghost sm" onClick={() => setConfirmReset(true)}>清除全部資料</button>
        )}
      </div>
    </div>
  )
}
