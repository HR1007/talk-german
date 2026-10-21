import { ChevronRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { ThemeButton } from '../components/Layout'

export default function Landing() {
  return (
    <div className="landing">
      <div style={{ position: 'fixed', top: 16, right: 16 }}>
        <ThemeButton />
      </div>
      <div className="stack" style={{ alignItems: 'center', gap: 24 }}>
        <img src={`${import.meta.env.BASE_URL}pretzel.png`} alt="" />
        <div className="stack-sm" style={{ alignItems: 'center' }}>
          <h1>Deutsch Translater</h1>
          <p className="muted">🇩🇪 → 🇹🇼　德文語音即時翻譯 · 每天 10 個 B1 單字</p>
        </div>
        <div className="row" style={{ flexWrap: 'wrap', justifyContent: 'center' }}>
          <Link to="/translate" className="btn">
            開始使用 <ChevronRight size={18} />
          </Link>
          <Link to="/daily" className="btn ghost">
            今日 10 字
          </Link>
        </div>
      </div>
    </div>
  )
}
