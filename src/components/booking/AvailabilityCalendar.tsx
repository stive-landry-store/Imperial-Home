import { useState } from 'react'
import { addMonths, format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval } from 'date-fns'
import { isDateAvailable, todayIso } from '../../lib/availability'
import type { DateRange } from '../../types/database'
import { cn } from '../../lib/cn'

function toIso(d: Date) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function AvailabilityCalendar({
  ranges,
  checkIn,
  checkOut,
  onSelect,
}: {
  ranges: DateRange[]
  checkIn: string
  checkOut: string
  onSelect: (iso: string) => void
}) {
  const [cursor, setCursor] = useState(new Date())
  const monthStart = startOfMonth(cursor)
  const days = eachDayOfInterval({
    start: startOfWeek(monthStart, { weekStartsOn: 1 }),
    end: endOfWeek(endOfMonth(cursor), { weekStartsOn: 1 }),
  })
  const today = todayIso()

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <button type="button" onClick={() => setCursor(addMonths(cursor, -1))} className="px-2 text-lg text-[#d4af6a]">
          ‹
        </button>
        <p className="font-display text-xl">{format(cursor, 'MMMM yyyy')}</p>
        <button type="button" onClick={() => setCursor(addMonths(cursor, 1))} className="px-2 text-lg text-[#d4af6a]">
          ›
        </button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-[12px] uppercase tracking-wider text-[#d4af6a]/70">
        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => (
          <div key={d}>{d}</div>
        ))}
      </div>
      <div className="mt-1 grid grid-cols-7 gap-1">
        {days.map((date) => {
          const day = toIso(date)
          const inMonth = date.getMonth() === cursor.getMonth()
          const past = day < today
          const free = isDateAvailable(day, ranges)
          const selected = Boolean(checkIn && checkOut && day >= checkIn && day < checkOut)
          const isStart = day === checkIn
          return (
            <button
              key={day}
              type="button"
              disabled={past || !free}
              onClick={() => onSelect(day)}
              className={cn(
                'aspect-square text-base',
                !inMonth && 'opacity-30',
                past || !free ? 'cursor-not-allowed opacity-35 line-through' : 'hover:bg-[#c4a35a]/20',
                selected && 'bg-[#c4a35a]/25',
                isStart && 'bg-[#c4a35a] text-black',
              )}
            >
              {date.getDate()}
            </button>
          )
        })}
      </div>
    </div>
  )
}
