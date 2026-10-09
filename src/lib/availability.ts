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

/**
 * Reserved nights are not part of the stay. If the chosen window overlaps a
 * reservation, counting starts the day that reservation ends. When the window
 * ends inside a reserved block, the same number of nights starts after it.
 */
export function stayAfterReserved(checkIn: string, checkOut: string, ranges: OccupiedRange[]) {
  const nights = nightsBetween(checkIn, checkOut)
  if (nights <= 0) return { checkIn, checkOut, shifted: false }
  const overlapping = ranges.filter((range) => rangesOverlap(checkIn, checkOut, range.start_date, range.end_date))
  if (overlapping.length === 0) return { checkIn, checkOut, shifted: false }
  const lastEnd = overlapping.reduce(
    (max, range) => (toUtc(range.end_date) > toUtc(max) ? range.end_date : max),
    overlapping[0].end_date,
  )
  if (toUtc(lastEnd) < toUtc(checkOut)) {
    return { checkIn: lastEnd, checkOut, shifted: lastEnd !== checkIn }
  }
  const nextOut = addDaysIso(lastEnd, nights)
  return { checkIn: lastEnd, checkOut: nextOut, shifted: true }
}
