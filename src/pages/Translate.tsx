import { CircleCheck, ExternalLink, LoaderCircle, Mic, Square, TriangleAlert, Type, Upload } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { SpeakButton } from '../components/bits'
import { Segmented } from '../components/Sliding'
import { canRecognize, createRecognizer, type Recognizer } from '../lib/speech'
import { TranslateError, translateDeToZh } from '../lib/translate'

type Mode = 'record' | 'text' | 'upload'
type Phase = { kind: 'idle' } | { kind: 'busy'; label: string } | { kind: 'done' } | { kind: 'error'; message: string }

const ORIGINAL = 'https://deutsch-translater.figma.site'

const MIC_ERRORS: Record<string, string> = {
  'not-allowed': '瀏覽器沒有允許使用麥克風，請在網址列旁的權限設定開啟。',
  'no-speech': '沒有聽到聲音，靠近麥克風再試一次。',
  network: '語音辨識需要網路連線。',
  'audio-capture': '找不到麥克風。',
}

function StatusPill({ phase }: { phase: Phase }) {
  if (phase.kind === 'busy') return <span className="pill busy"><LoaderCircle size={14} className="spin" />{phase.label}</span>
  if (phase.kind === 'done') return <span className="pill ok"><CircleCheck size={14} />翻譯完成</span>
  if (phase.kind === 'error') return <span className="pill bad"><TriangleAlert size={14} />{phase.message}</span>
  return null
}

export default function Translate() {
  const [mode, setMode] = useState<Mode>(canRecognize() ? 'record' : 'text')
  const [source, setSource] = useState('')
  const [interim, setInterim] = useState('')
  const [result, setResult] = useState('')
  const [phase, setPhase] = useState<Phase>({ kind: 'idle' })
  const [recording, setRecording] = useState(false)
  const [seconds, setSeconds] = useState(0)
  const recRef = useRef<Recognizer | null>(null)
  const latest = useRef('')
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    if (!recording) return
    const t = window.setInterval(() => setSeconds((s) => s + 1), 1000)
    return () => window.clearInterval(t)
  }, [recording])

  useEffect(() => () => {
    recRef.current?.stop()
    abortRef.current?.abort()
  }, [])

  async function runTranslate(text: string) {
    const clean = text.trim()
    if (!clean) {
      setPhase({ kind: 'error', message: '沒有可以翻譯的德文' })
      return
    }
    abortRef.current?.abort()
    const ctrl = new AbortController()
    abortRef.current = ctrl
    setPhase({ kind: 'busy', label: '翻譯中…' })
    try {
      setResult(await translateDeToZh(clean, ctrl.signal))
      setPhase({ kind: 'done' })
    } catch (e) {
      if (ctrl.signal.aborted) return
      setPhase({ kind: 'error', message: e instanceof TranslateError ? e.message : '網路連線失敗，請檢查網路後再試。' })
    }
  }

  function startRecording() {
    setSource('')
    setInterim('')
    setResult('')
    latest.current = ''
    const rec = createRecognizer({
      onText: (finalText, partial) => {
        latest.current = finalText
        setSource(finalText)
        setInterim(partial)
      },
      onError: (code) => {
        if (code === 'aborted') return
        setPhase({ kind: 'error', message: MIC_ERRORS[code] ?? '語音辨識中斷了，請再試一次。' })
      },
      onEnd: () => {
        setRecording(false)
        setInterim('')
        if (latest.current) void runTranslate(latest.current)
      },
    })
    if (!rec) return
    recRef.current = rec
    setSeconds(0)
    setPhase({ kind: 'busy', label: '辨識中…說德文吧' })
    setRecording(true)
    rec.start()
  }

  function stopRecording() {
    recRef.current?.stop()
  }

  const mm = String(Math.floor(seconds / 60)).padStart(2, '0')
  const ss = String(seconds % 60).padStart(2, '0')

  return (
    <div className="card translator">
      <img src={`${import.meta.env.BASE_URL}pretzel.png`} alt="" width={88} height={88} style={{ imageRendering: 'pixelated' }} />
      <div className="stack-sm" style={{ alignItems: 'center' }}>
        <h1>Deutsch Translater</h1>
        <p className="muted">即時錄音或貼上德文，自動翻譯成繁體中文</p>
      </div>

      <Segmented
        variant="tabs"
        role="tablist"
        label="翻譯方式"
        value={mode}
        onChange={setMode}
        options={[
          { value: 'record', label: <><Mic size={16} />即時錄音</> },
          { value: 'text', label: <><Type size={16} />文字輸入</> },
          { value: 'upload', label: <><Upload size={16} />上傳檔案</> },
        ]}
      />

      {mode === 'record' && (
        canRecognize() ? (
          <div className="stack-sm" style={{ alignItems: 'center', width: '100%' }}>
            <button type="button" className={`mic${recording ? ' rec' : ''}`} onClick={recording ? stopRecording : startRecording} aria-label={recording ? '停止錄音' : '開始錄音'}>
              {recording ? <Square size={30} fill="currentColor" /> : <Mic size={34} />}
            </button>
            <p className="xs" style={{ fontVariantNumeric: 'tabular-nums' }}>{recording ? `${mm}:${ss} · 點一下停止並翻譯` : '點一下開始錄音（瀏覽器會詢問麥克風權限）'}</p>
          </div>
        ) : (
          <div className="drop">
            <TriangleAlert size={28} />
            <b>這個瀏覽器不支援即時語音辨識</b>
            <span className="xs">請改用 Chrome 或 Edge，或切到「文字輸入」。</span>
          </div>
        )
      )}

      {mode === 'text' && (
        <form className="stack-sm" style={{ width: '100%' }} onSubmit={(e) => { e.preventDefault(); void runTranslate(source) }}>
          <label className="sr-only" htmlFor="de-text">德文內容</label>
          <textarea id="de-text" className="input" placeholder="例：Die Vorlesung fällt heute aus, weil der Professor krank ist." value={source} onChange={(e) => setSource(e.target.value)} />
          <button className="btn" type="submit" disabled={phase.kind === 'busy'}>翻譯</button>
        </form>
      )}

      {mode === 'upload' && (
        <div className="drop">
          <Upload size={28} />
          <b>音檔辨識需要伺服器端的語音服務</b>
          <span className="xs">這個版本放在 GitHub Pages（純靜態網站），沒辦法處理上傳的音檔。請用原版上傳 MP3、WAV、M4A。</span>
          <a className="btn ghost sm" href={ORIGINAL} target="_blank" rel="noopener noreferrer">開啟原版上傳 <ExternalLink size={14} /></a>
        </div>
      )}

      {mode !== 'upload' && <StatusPill phase={phase} />}

      {mode !== 'upload' && (source || interim) && (
        <div className="result" aria-live="polite">
          <div className="between"><span className="label">德文</span>{source && <SpeakButton text={source} label="朗讀德文" />}</div>
          <p className="de">{source}{interim && <span style={{ color: 'var(--faint)' }}> {interim}</span>}</p>
          {result && (
            <>
              <span className="label">繁體中文</span>
              <p className="de" style={{ color: 'var(--ink)', fontWeight: 500 }}>{result}</p>
            </>
          )}
        </div>
      )}
      <p className="xs">翻譯由 MyMemory 提供，免費額度每天約 5,000 字。</p>
    </div>
  )
}
