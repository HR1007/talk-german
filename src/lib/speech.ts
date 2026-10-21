/** 用瀏覽器內建的德語語音朗讀（不需要網路服務） */
export function canSpeak() {
  return typeof window !== 'undefined' && 'speechSynthesis' in window
}

export function speak(text: string) {
  if (!canSpeak()) return
  const synth = window.speechSynthesis
  synth.cancel()
  const u = new SpeechSynthesisUtterance(text)
  u.lang = 'de-DE'
  const voice = synth.getVoices().find((v) => v.lang.startsWith('de'))
  if (voice) u.voice = voice
  u.rate = 0.92
  synth.speak(u)
}

/* ---------- 即時語音辨識（Chrome / Edge 的 Web Speech API） ---------- */

type RecognitionResult = { isFinal: boolean; 0: { transcript: string } }
type RecognitionEvent = { resultIndex: number; results: ArrayLike<RecognitionResult> }

export type Recognizer = {
  start: () => void
  stop: () => void
}

type RecognitionCtor = new () => {
  lang: string
  continuous: boolean
  interimResults: boolean
  onresult: ((e: RecognitionEvent) => void) | null
  onerror: ((e: { error: string }) => void) | null
  onend: (() => void) | null
  start: () => void
  stop: () => void
}

function ctor(): RecognitionCtor | null {
  const w = window as unknown as { SpeechRecognition?: RecognitionCtor; webkitSpeechRecognition?: RecognitionCtor }
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null
}

export function canRecognize() {
  return typeof window !== 'undefined' && ctor() !== null
}

export function createRecognizer(handlers: {
  onText: (finalText: string, interim: string) => void
  onError: (code: string) => void
  onEnd: () => void
}): Recognizer | null {
  const C = ctor()
  if (!C) return null
  const rec = new C()
  rec.lang = 'de-DE'
  rec.continuous = true
  rec.interimResults = true
  let finalText = ''
  rec.onresult = (e) => {
    let interim = ''
    for (let i = e.resultIndex; i < e.results.length; i++) {
      const r = e.results[i]
      if (r.isFinal) finalText += r[0].transcript.trim() + ' '
      else interim += r[0].transcript
    }
    handlers.onText(finalText.trim(), interim.trim())
  }
  rec.onerror = (e) => handlers.onError(e.error)
  rec.onend = handlers.onEnd
  return {
    start: () => {
      finalText = ''
      rec.start()
    },
    stop: () => rec.stop(),
  }
}
