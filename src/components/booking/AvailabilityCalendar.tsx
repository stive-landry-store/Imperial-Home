import { useState } from 'react'
import { addMonths, format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval } from 'date-fns'
import { enUS, fr } from 'date-fns/locale'
import { useTranslation } from 'react-i18next'
import { isDateAvailable, todayIso } from '../../lib/availability'
import type { DateRange } from '../../types/database'
import { cn } from '../../lib/cn'

function toIso(d: Date) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function occupancy(day: string, ranges: DateRange[]) {
  return ranges.find((r) => !isDateAvailable(day, [r]))
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
  const { t, i18n } = useTranslation()
  const [cursor, setCursor] = useState(new Date())
  const monthStart = startOfMonth(cursor)
  const days = eachDayOfInterval({
    start: startOfWeek(monthStart, { weekStartsOn: 1 }),
    end: endOfWeek(endOfMonth(cursor), { weekStartsOn: 1 }),
  })
  const today = todayIso()
  const locale = i18n.language.startsWith('fr') ? fr : enUS
  const dow = t('cal.dow', { returnObjects: true }) as string[]

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <button type="button" onClick={() => setCursor(addMonths(cursor, -1))} className="px-2 text-lg text-[#d4af6a]">
          ‹
        </button>
        <p className="font-display text-xl capitalize">{format(cursor, 'MMMM yyyy', { locale })}</p>
        <button type="button" onClick={() => setCursor(addMonths(cursor, 1))} className="px-2 text-lg text-[#d4af6a]">
          ›
        </button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-[11px] uppercase tracking-wider text-[#d4af6a]/70">
        {(Array.isArray(dow) ? dow : ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']).map((d) => (
          <div key={d}>{d}</div>
        ))}
      </div>
      <div className="mt-1 grid grid-cols-7 gap-1">
        {days.map((date) => {
          const day = toIso(date)
          const inMonth = date.getMonth() === cursor.getMonth()
          const past = day < today
          const hit = occupancy(day, ranges)
          const reserved = Boolean(hit)
          const free = !reserved
          const selected = Boolean(checkIn && checkOut && day >= checkIn && day < checkOut)
          const isStart = day === checkIn
          const label = reserved
            ? hit?.kind === 'reservation'
              ? t('cal.reserved')
              : t('cal.unavailable')
            : null
          return (
            <button
              key={day}
              type="button"
              disabled={past || reserved}
              onClick={() => onSelect(day)}
              title={label ?? undefined}
              className={cn(
                'flex min-h-[3.4rem] flex-col items-center justify-center px-0.5 py-1 text-sm',
                !inMonth && 'opacity-30',
                past && !reserved && 'cursor-not-allowed opacity-40',
                reserved && 'cursor-not-allowed bg-[#8a1c1c]/20 text-[#c9a070]',
                !past && free && 'hover:bg-[#c4a35a]/20',
                selected && !reserved && 'bg-[#c4a35a]/25',
                isStart && !reserved && 'bg-[#c4a35a] text-black',
              )}
            >
              <span className={cn('leading-none', reserved && 'font-medium line-through decoration-[#c4a35a] decoration-2')}>
                {date.getDate()}
              </span>
              {label ? (
                <span className="mt-1 max-w-full truncate text-[8px] leading-none font-medium tracking-[0.08em] uppercase text-[#d4af6a]">
                  {label}
                </span>
              ) : null}
            </button>
          )
        })}
      </div>
      <ul className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-[11px] uppercase tracking-wider theme-muted">
        <li className="flex items-center gap-1.5">
          <span className="inline-block h-2 w-2 rounded-full bg-[#c4a35a]" />
          {t('cal.available')}
        </li>
        <li className="flex items-center gap-1.5">
          <span className="inline-block h-2 w-2 rounded-full bg-[#8a1c1c]/70" />
          <span className="line-through decoration-[#c4a35a]">{t('cal.reserved')}</span>
        </li>
        <li className="flex items-center gap-1.5">
          <span className="inline-block h-2 w-2 border border-[#d4af6a]/50" />
          {t('cal.unavailable')}
        </li>
      </ul>
    </div>
  )
}
