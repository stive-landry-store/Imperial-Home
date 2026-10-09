import { languageCode } from './languages'

const memory = new Map<string, string>()
const pending = new Map<string, Promise<unknown>>()
const listeners = new Set<() => void>()

const CODES: Record<string, string> = {
  en: 'en',
  zh: 'zh-CN',
  hi: 'hi',
  es: 'es',
  fr: 'fr',
  ar: 'ar',
  bn: 'bn',
  pt: 'pt',
  ru: 'ru',
  ur: 'ur',
}

export { languageCode }

const PROTECTED = new Set([
  'Impérial Home',
  'Imperial Home',
  "L'art du soin. L'esprit du détail.",
  'The art of care. The spirit of detail.',
  "L'ART DU SOIN. L'ESPRIT DU DÉTAIL.",
])

export function subscribeTranslations(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function storageKey(lang: string, text: string) {
  return `ih-tr:${lang}:${text}`
}

function readStored(lang: string, text: string) {
  const hit = memory.get(storageKey(lang, text))
  if (hit) return hit
  try {
    const stored = localStorage.getItem(storageKey(lang, text))
    if (stored) {
      memory.set(storageKey(lang, text), stored)
      return stored
    }
  } catch {
    /* private mode */
  }
  return null
}

function writeStored(lang: string, text: string, value: string) {
  memory.set(storageKey(lang, text), value)
  try {
    localStorage.setItem(storageKey(lang, text), value)
  } catch {
    /* quota */
  }
  listeners.forEach((listener) => listener())
}

export function peekTranslation(text: string, lang: string) {
  if (!text || PROTECTED.has(text.trim())) return text
  return readStored(lang, text) ?? text
}

type QueueItem = { text: string; lang: string; source: 'fr' | 'en'; shielded: string }

const queue: QueueItem[] = []
let flushTimer = 0

function shield(text: string) {
  return text
    .split("L'art du soin. L'esprit du détail.").join('XHMOTTO')
    .split('The art of care. The spirit of detail.').join('XHMOTTO')
    .split('IMPÉRIAL HOME').join('XHNAME')
    .split('IMPERIAL HOME').join('XHNAME')
    .split('Impérial Home').join('XHNAME')
    .split('Imperial Home').join('XHNAME')
}

function restore(text: string) {
  return text.split('XHMOTTO').join("L'art du soin. L'esprit du détail.").split('XHNAME').join('Impérial Home')
}

async function flush() {
  const batch = queue.splice(0, 12)
  if (!batch.length) return
  const source = batch[0].source
  const lang = batch[0].lang
  const same = batch.filter((item) => item.source === source && item.lang === lang)
  queue.unshift(...batch.filter((item) => item.source !== source || item.lang !== lang))
  const url = import.meta.env.VITE_SUPABASE_URL
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY
  try {
    if (url && key) {
      const response = await fetch(`${url}/functions/v1/translate`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${key}`,
          apikey: key,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          texts: same.map((item) => item.shielded),
          source,
          target: CODES[lang] ?? 'en',
        }),
      })
      const data = (await response.json()) as { texts?: string[] }
      same.forEach((item, index) => {
        const value = restore(data.texts?.[index] ?? '').trim()
        if (value) writeStored(item.lang, item.text, value)
      })
    }
  } catch {
    /* keep the original text */
  } finally {
    same.forEach((item) => pending.delete(storageKey(item.lang, item.text)))
    if (queue.length) void flush()
  }
}

export function requestTranslation(text: string, lang: string, source: 'fr' | 'en' = 'en') {
  const clean = text.trim()
  if (!clean || PROTECTED.has(clean) || lang === source) return
  if (readStored(lang, text) || pending.has(storageKey(lang, text))) return
  pending.set(storageKey(lang, text), Promise.resolve())
  queue.push({ text, lang, source, shielded: shield(clean).slice(0, 450) })
  window.clearTimeout(flushTimer)
  flushTimer = window.setTimeout(() => void flush(), 80)
}
