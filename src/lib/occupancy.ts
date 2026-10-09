function isoDay(year: number, monthIndex: number, day: number) {
  return `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

/** Nights of a stay that fall inside a calendar month. Check-out day is not occupied. */
export function nightsInMonth(checkIn: string, checkOut: string, year: number, monthIndex: number) {
  const start = isoDay(year, monthIndex, 1)
  const end = isoDay(monthIndex === 11 ? year + 1 : year, monthIndex === 11 ? 0 : monthIndex + 1, 1)
  const from = checkIn > start ? checkIn : start
  const to = checkOut < end ? checkOut : end
  const ms = Date.parse(to + 'T00:00:00') - Date.parse(from + 'T00:00:00')
  if (!Number.isFinite(ms)) return 0
  return Math.max(0, Math.round(ms / 86_400_000))
}

export function daysInMonth(year: number, monthIndex: number) {
  return new Date(year, monthIndex + 1, 0).getDate()
}
