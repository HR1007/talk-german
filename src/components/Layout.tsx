import { CalendarDays, ClipboardCheck, Cloud, CloudAlert, CloudCheck, CloudOff, Languages, Library, Moon, Sun } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { useSync } from '../lib/cloud'
import { useClipIndicator } from './Sliding'
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

/** 上方分頁與手機底部分頁列都用同一個滑動泡泡（見 Sliding.tsx） */
function TopNav() {
  const [box, setBox] = useState<HTMLElement | null>(null)
  const { pathname } = useLocation()
  const indicator = useClipIndicator(box, '.nav-base a.active', pathname)
  return (
    <nav className="nav" ref={setBox} aria-label="主要分頁">
      <div className="nav-base">
        {TABS.map((t) => (
          <NavLink key={t.to} to={t.to}>{t.label}</NavLink>
        ))}
      </div>
      <div className={`nav-active${indicator.className}`} aria-hidden="true" style={indicator.style}>
        {TABS.map((t) => (
          <span key={t.to}>{t.label}</span>
        ))}
      </div>
    </nav>
  )
}

function TabBar() {
  const [box, setBox] = useState<HTMLElement | null>(null)
  const { pathname } = useLocation()
  const indicator = useClipIndicator(box, '.tabbar-base a.active', pathname)
  return (
    <nav className="tabbar" ref={setBox} aria-label="主要分頁">
      <div className="tabbar-base">
        {TABS.map((t) => (
          <NavLink key={t.to} to={t.to}>
            <t.icon size={22} />
            {t.label}
          </NavLink>
        ))}
      </div>
      <div className={`tabbar-active${indicator.className}`} aria-hidden="true" style={indicator.style}>
        {TABS.map((t) => (
          <span key={t.to}>
            <t.icon size={22} />
            {t.label}
          </span>
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
      <TabBar />
    </div>
  )
}
