import { DAYS } from '../data'

const pad = (n: number) => String(n).padStart(2, '0')

/** 本地時間的 YYYY-MM-DD（每天換一組字的依據） */
export function dateKey(d = new Date()) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export function parseKey(key: string) {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, m - 1, d)
}

/** 從 2026-01-01 起算的天數；同一天所有人拿到同一組字 */
export function dayNumber(key = dateKey()) {
  const epoch = new Date(2026, 0, 1).getTime()
  return Math.round((parseKey(key).getTime() - epoch) / 86_400_000)
}

export function dayIndex(key = dateKey()) {
  const n = dayNumber(key)
  return ((n % DAYS.length) + DAYS.length) % DAYS.length
}

export function addDays(key: string, delta: number) {
  const d = parseKey(key)
  d.setDate(d.getDate() + delta)
  return dateKey(d)
}

const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六']

export function prettyDate(key = dateKey()) {
  const d = parseKey(key)
  return `${d.getMonth() + 1} 月 ${d.getDate()} 日（週${WEEKDAYS[d.getDay()]}）`
}

export function shortDate(key: string) {
  const d = parseKey(key)
  return `${d.getMonth() + 1}/${d.getDate()}`
}

/** 本週一到週日的日期 key，用來畫連續學習的七個圓點 */
export function thisWeek(key = dateKey()) {
  const d = parseKey(key)
  const monday = addDays(key, -((d.getDay() + 6) % 7))
  return Array.from({ length: 7 }, (_, i) => addDays(monday, i))
}
