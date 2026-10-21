import { useEffect, useLayoutEffect, useState, type ReactNode } from 'react'

/**
 * 滑動的選中泡泡，全站共用。
 * 做法：在可點的按鈕列上面疊一份「選中樣式」的複本，用 clip-path 只露出選中那格；
 * 換選項時滑動裁切範圍。底色和選中的字是同一個元素一起被露出來，不會錯位。
 * 只動 clip-path（不重排版）；第一次量好位置後才開過渡，避免一載入就從角落滑進來。
 */
export function useClipIndicator(box: HTMLElement | null, activeSelector: string, dep: unknown) {
  const [clip, setClip] = useState<string | null>(null)
  const [ready, setReady] = useState(false)

  useLayoutEffect(() => {
    if (!box) return
    const measure = () => {
      const active = box.querySelector<HTMLElement>(activeSelector)
      if (!active) return setClip(null)
      const w = box.clientWidth
      const h = box.clientHeight
      const { offsetLeft: l, offsetTop: t, offsetWidth: aw, offsetHeight: ah } = active
      const r = getComputedStyle(active).borderRadius || '999px'
      setClip(`inset(${t}px ${w - l - aw}px ${h - t - ah}px ${l}px round ${r})`)
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(box)
    document.fonts?.ready.then(measure)
    return () => ro.disconnect()
  }, [box, activeSelector, dep])

  useEffect(() => {
    if (clip && !ready) {
      const id = requestAnimationFrame(() => setReady(true))
      return () => cancelAnimationFrame(id)
    }
  }, [clip, ready])

  return {
    className: ready ? ' ready' : '',
    style: { clipPath: clip ?? 'inset(50% 50% 50% 50% round 999px)', opacity: clip ? 1 : 0 },
  }
}

export type Option<T extends string | number> = { value: T; label: ReactNode }

/**
 * 分段選擇器（取代原本的 .seg）。variant="tabs" 是翻譯頁那種滿版分頁。
 */
export function Segmented<T extends string | number>({
  options,
  value,
  onChange,
  label,
  variant = 'seg',
  role = 'group',
}: {
  options: Option<T>[]
  value: T
  onChange: (v: T) => void
  label: string
  variant?: 'seg' | 'tabs'
  role?: 'group' | 'tablist'
}) {
  const [box, setBox] = useState<HTMLDivElement | null>(null)
  // 標籤文字（例如「全部 12」）變了寬度也會變，所以一起列入重新量測的條件
  const labels = options.map((o) => (typeof o.label === 'string' || typeof o.label === 'number' ? o.label : String(o.value))).join('|')
  const indicator = useClipIndicator(box, '[data-on="true"]', `${String(value)}|${labels}`)
  const cls = variant === 'tabs' ? 'tabs' : 'seg'

  return (
    <div className={`${cls} slide`} role={role} aria-label={label} ref={setBox}>
      {options.map((o) => {
        const on = o.value === value
        return (
          <button
            key={String(o.value)}
            type="button"
            data-on={on}
            className={on ? 'on' : ''}
            role={role === 'tablist' ? 'tab' : undefined}
            aria-selected={role === 'tablist' ? on : undefined}
            aria-pressed={role === 'group' ? on : undefined}
            onClick={() => onChange(o.value)}
          >
            {o.label}
          </button>
        )
      })}
      <div className={`${cls}-active slide-active${indicator.className}`} aria-hidden="true" style={indicator.style}>
        {options.map((o) => (
          <span key={String(o.value)}>{o.label}</span>
        ))}
      </div>
    </div>
  )
}
