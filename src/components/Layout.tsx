import { CalendarDays, ClipboardCheck, Cloud, CloudAlert, CloudCheck, CloudOff, Languages, Library, Moon, Sun } from 'lucide-react'
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { useSync } from '../lib/cloud'
import { setTheme, useStore } from '../lib/store'

const TABS = [
  { to: '/translate', label: '翻譯', icon: Languages },
  { to: '/daily', label: '每日單字', icon: CalendarDays },
  { to: '/library', label: '單字庫', icon: Library },
  { to: '/quiz', label: '測驗', icon: ClipboardCheck },
]

function useSystemDark() {
  const [dark, setDark] = useState(() => window.matchMedia('(prefers-color-scheme: dark)').matches)
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const on = (e: MediaQueryListEvent) => setDark(e.matches)
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [])
  return dark
}

export function useThemeSync() {
  const { theme } = useStore()
  const systemDark = useSystemDark()
  const dark = theme ? theme === 'dark' : systemDark
  useEffect(() => {
    const root = document.documentElement
    if (theme) root.dataset.theme = theme
    else delete root.dataset.theme
  }, [theme])
  return dark
}

export function ThemeButton() {
  const dark = useThemeSync()
  return (
    <button className="iconbtn" type="button" onClick={() => setTheme(dark ? 'light' : 'dark')} aria-label={dark ? '切換淺色模式' : '切換深色模式'}>
      {dark ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  )
}

function SyncButton() {
  const sync = useSync()
  if (sync.kind === 'off') return null
  const map = {
    'signed-out': { Icon: CloudOff, label: '登入以同步到雲端' },
    syncing: { Icon: Cloud, label: '同步中' },
    synced: { Icon: CloudCheck, label: '已同步到雲端' },
    error: { Icon: CloudAlert, label: '同步失敗，點開查看' },
  } as const
  const { Icon, label } = map[sync.kind]
  return (
    <Link to="/account" className="iconbtn" aria-label={label} title={label} style={sync.kind === 'error' ? { color: 'var(--bad)' } : undefined}>
      <Icon size={18} />
    </Link>
  )
}

/**
 * 上方分頁：疊一份「選中樣式」的分頁列在原本那列上面，用 clip-path 只露出選中的那格，
 * 換分頁時滑動裁切範圍。底色和白字是同一個元素一起被露出來，不會有顏色先到、字後到的錯位。
 */
function TopNav() {
  const navRef = useRef<HTMLElement>(null)
  const { pathname } = useLocation()
  const [clip, setClip] = useState<string | null>(null)
  const [ready, setReady] = useState(false)

  useLayoutEffect(() => {
    const nav = navRef.current
    if (!nav) return
    const measure = () => {
      const active = nav.querySelector<HTMLElement>('.nav-base a.active')
      if (!active) return setClip(null)
      const w = nav.clientWidth
      const h = nav.clientHeight
      const left = active.offsetLeft
      const top = active.offsetTop
      setClip(`inset(${top}px ${w - left - active.offsetWidth}px ${h - top - active.offsetHeight}px ${left}px round 999px)`)
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(nav)
    document.fonts?.ready.then(measure)
    return () => ro.disconnect()
  }, [pathname])

  // 第一次量好位置之後才打開過渡，避免一載入就從角落滑進來
  useEffect(() => {
    if (clip && !ready) requestAnimationFrame(() => setReady(true))
  }, [clip, ready])

  return (
    <nav className="nav" ref={navRef} aria-label="主要分頁">
      <div className="nav-base">
        {TABS.map((t) => (
          <NavLink key={t.to} to={t.to}>{t.label}</NavLink>
        ))}
      </div>
      <div className={`nav-active${ready ? ' ready' : ''}`} aria-hidden="true" style={{ clipPath: clip ?? 'inset(50% 50% 50% 50% round 999px)', opacity: clip ? 1 : 0 }}>
        {TABS.map((t) => (
          <span key={t.to}>{t.label}</span>
        ))}
      </div>
    </nav>
  )
}

export default function Layout() {
  return (
    <div className="app">
      <header className="topbar">
        <Link to="/daily" className="brand">
          <img src={`${import.meta.env.BASE_URL}pretzel.png`} alt="" />
          <b>Deutsch Translater</b>
        </Link>
        <TopNav />
        <div className="row" style={{ gap: 8 }}>
          <SyncButton />
          <ThemeButton />
        </div>
      </header>
      <main className="main">
        <Outlet />
      </main>
      <nav className="tabbar" aria-label="主要分頁">
        {TABS.map((t) => (
          <NavLink key={t.to} to={t.to}>
            <t.icon size={22} />
            {t.label}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
