export function formatXaf(amount: number, locale = 'fr-CM') {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: 'XAF',
    maximumFractionDigits: 0,
  }).format(amount)
}

export function formatDate(iso: string, locale = 'en-GB') {
  return new Intl.DateTimeFormat(locale, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(iso + (iso.length === 10 ? 'T00:00:00' : '')))
}

export function nightsBetween(checkIn: string, checkOut: string) {
  const a = new Date(checkIn + 'T00:00:00')
  const b = new Date(checkOut + 'T00:00:00')
  return Math.round((b.getTime() - a.getTime()) / 86_400_000)
}

export function coverImage(images?: { url: string | null; is_cover: boolean; sort_order: number }[]) {
  if (!images?.length) return undefined
  return [...images].sort((a, b) => Number(b.is_cover) - Number(a.is_cover) || a.sort_order - b.sort_order)[0]?.url ?? undefined
}

export function localized(en: string | null | undefined, fr: string | null | undefined, lang: string) {
  if (lang.startsWith('fr')) return fr || en || ''
  return en || fr || ''
}
