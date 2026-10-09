import type { TFunction } from 'i18next'

export function visibleMessage(body: string, t: TFunction) {
  if (body.startsWith('[[assigned]]')) {
    return t('chat.assigned', { name: body.slice('[[assigned]]'.length) })
  }
  return body
}

const SEEN = 'ih-chat-seen'

export function chatSeen(id: string) {
  try {
    const map = JSON.parse(localStorage.getItem(SEEN) || '{}') as Record<string, string>
    return map[id] || ''
  } catch {
    return ''
  }
}

export function markChatSeen(id: string) {
  try {
    const map = JSON.parse(localStorage.getItem(SEEN) || '{}') as Record<string, string>
    map[id] = new Date().toISOString()
    localStorage.setItem(SEEN, JSON.stringify(map))
  } catch {
    /* ignore private mode */
  }
}

export function chatWhen(iso: string | null, locale: string) {
  if (!iso) return ''
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  const time = new Intl.DateTimeFormat(locale, { hour: '2-digit', minute: '2-digit' }).format(date)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const day = new Date(date)
  day.setHours(0, 0, 0, 0)
  const diff = Math.round((today.getTime() - day.getTime()) / 86_400_000)
  if (diff <= 0) return time
  if (diff === 1) return locale.startsWith('fr') ? 'hier' : 'yesterday'
  if (diff < 7) return new Intl.DateTimeFormat(locale, { weekday: 'long' }).format(date).toLocaleLowerCase(locale)
  return new Intl.DateTimeFormat(locale, { day: '2-digit', month: '2-digit', year: '2-digit' }).format(date)
}

export function chatDay(iso: string, locale: string) {
  const date = new Date(iso)
  return new Intl.DateTimeFormat(locale, { weekday: 'short', day: 'numeric', month: 'short' }).format(date)
}
