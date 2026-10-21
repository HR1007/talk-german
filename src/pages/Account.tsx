import { CircleCheck, CloudOff, LoaderCircle, Mail, TriangleAlert } from 'lucide-react'
import { useState } from 'react'
import { sendMagicLink, signOut, useSync } from '../lib/cloud'

export default function Account() {
  const sync = useSync()
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      await sendMagicLink(email.trim())
      setSent(email.trim())
    } catch (err) {
      const msg = err instanceof Error ? err.message : ''
      setError(/rate|seconds/i.test(msg) ? '寄信太頻繁了，等一分鐘再試。' : '寄不出登入信，請確認 email 是否正確。')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="card" style={{ maxWidth: 560, margin: '24px auto 0' }}>
      <div className="stack-sm" style={{ gap: 6 }}>
        <h1>雲端同步</h1>
        <p className="muted">不登入也能用，單字庫會存在這個瀏覽器。用 email 登入後，標記過的字、測驗紀錄和連續天數會同步到雲端，換手機或電腦也看得到。</p>
      </div>

      {sync.kind === 'off' && (
        <div className="feedback bad"><span className="title"><CloudOff size={14} /> 這個版本沒有設定雲端同步</span></div>
      )}

      {sync.kind === 'signed-out' && (
        sent ? (
          <div className="feedback ok">
            <span className="title"><Mail size={14} /> 登入連結已寄到 {sent}</span>
            <span className="zh">打開信裡的連結就會回到這裡並自動登入。請用同一個瀏覽器打開。沒收到的話看一下垃圾郵件匣。</span>
          </div>
        ) : (
          <form className="stack-sm" onSubmit={submit}>
            <label className="xs" htmlFor="email">Email</label>
            <input id="email" type="email" required className="input" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
            <button type="submit" className="btn" disabled={busy || !email.trim()}>{busy ? '寄送中…' : '寄登入連結給我'}</button>
            {error && <p className="xs" style={{ color: 'var(--bad)' }}>{error}</p>}
            <p className="xs">不用設定密碼，每次登入都用信裡的連結。這台裝置上已經有的紀錄會在登入後一起上傳。</p>
          </form>
        )
      )}

      {(sync.kind === 'syncing' || sync.kind === 'synced' || sync.kind === 'error') && (
        <div className="stack-sm">
          <div className="between"><span className="muted">登入帳號</span><b>{sync.email}</b></div>
          <div className="between">
            <span className="muted">同步狀態</span>
            {sync.kind === 'syncing' && <span className="pill busy"><LoaderCircle size={14} className="spin" />同步中…</span>}
            {sync.kind === 'synced' && <span className="pill ok"><CircleCheck size={14} />已同步 · {new Date(sync.at).toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' })}</span>}
            {sync.kind === 'error' && <span className="pill bad"><TriangleAlert size={14} />{sync.message}</span>}
          </div>
          <button type="button" className="btn ghost" onClick={() => void signOut()}>登出</button>
          <p className="xs">登出後這台裝置上的紀錄會留著，下次登入會再合併。</p>
        </div>
      )}
    </div>
  )
}
