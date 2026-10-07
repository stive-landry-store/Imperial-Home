export type OccupiedRange = { start_date: string; end_date: string }

function toUtc(iso: string) {
  return Date.parse(iso.length === 10 ? `${iso}T00:00:00Z` : iso)
}

/** Half-open stay [checkIn, checkOut). */
export function rangesOverlap(aStart: string, aEnd: string, bStart: string, bEnd: string) {
  return toUtc(aStart) < toUtc(bEnd) && toUtc(bStart) < toUtc(aEnd)
}

export function isDateAvailable(dateIso: string, ranges: OccupiedRange[]) {
  const next = addDaysIso(dateIso, 1)
  return !ranges.some((r) => rangesOverlap(dateIso, next, r.start_date, r.end_date))
}

export function stayIsAvailable(checkIn: string, checkOut: string, ranges: OccupiedRange[]) {
  if (toUtc(checkOut) <= toUtc(checkIn)) return false
  return !ranges.some((r) => rangesOverlap(checkIn, checkOut, r.start_date, r.end_date))
}

export function addDaysIso(iso: string, days: number) {
  const d = new Date(`${iso}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

export function eachDateIso(start: string, endExclusive: string) {
  const out: string[] = []
  let cur = start
  while (toUtc(cur) < toUtc(endExclusive)) {
    out.push(cur)
    cur = addDaysIso(cur, 1)
  }
  return out
}

export function todayIso() {
  return new Date().toISOString().slice(0, 10)
}

export function nightsBetween(checkIn: string, checkOut: string) {
  return Math.max(0, Math.round((toUtc(checkOut) - toUtc(checkIn)) / 86_400_000))
}

export function checkOutFromNights(checkIn: string, nights: number) {
  return addDaysIso(checkIn, Math.max(1, nights))
}
