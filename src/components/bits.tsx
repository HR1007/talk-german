import { Volume2 } from 'lucide-react'
import { Fragment } from 'react'
import type { Article } from '../data/types'
import { canSpeak, speak } from '../lib/speech'

/** 例句標記：[[…]] 句型關鍵字、{{…}} 第二關鍵字、**…** 當天的單字 */
export function Markup({ text }: { text: string }) {
  const parts = text.split(/(\[\[.+?\]\]|\{\{.+?\}\}|\*\*.+?\*\*)/g).filter(Boolean)
  return (
    <>
      {parts.map((p, i) => {
        if (p.startsWith('[[')) return <span key={i} className="hl">{p.slice(2, -2)}</span>
        if (p.startsWith('{{')) return <span key={i} className="hl2">{p.slice(2, -2)}</span>
        if (p.startsWith('**')) return <b key={i}>{p.slice(2, -2)}</b>
        return <Fragment key={i}>{p}</Fragment>
      })}
    </>
  )
}

export const plain = (text: string) => text.replace(/\[\[|\]\]|\{\{|\}\}|\*\*/g, '')

export function Art({ art, big }: { art: Article; big?: boolean }) {
  return <span className={`art ${art}${big ? ' big' : ''}`}>{art}</span>
}

export function SpeakButton({ text, label = '聽發音' }: { text: string; label?: string }) {
  if (!canSpeak()) return null
  return (
    <button
      type="button"
      className="speak"
      onClick={(e) => {
        e.stopPropagation()
        speak(text)
      }}
      aria-label={`${label}：${text}`}
      title={label}
    >
      <Volume2 size={16} />
    </button>
  )
}
