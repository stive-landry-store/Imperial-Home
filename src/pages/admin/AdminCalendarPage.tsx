import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Helmet } from 'react-helmet-async'
import { useTranslation } from 'react-i18next'
import { addMonths, eachDayOfInterval, endOfMonth, format, startOfMonth } from 'date-fns'
import { fetchAllReservations, fetchAllProperties } from '../../lib/data'
import { cn } from '../../lib/cn'

function iso(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const ACTIVE = ['pending', 'payment_processing', 'confirmed', 'completed'] as const

export function AdminCalendarPage() {
  const { t } = useTranslation()
  const [cursor, setCursor] = useState(new Date())
  const [propertyId, setPropertyId] = useState('all')
  const { data: reservations = [] } = useQuery({ queryKey: ['admin-reservations'], queryFn: fetchAllReservations })
  const { data: properties = [] } = useQuery({ queryKey: ['admin-properties'], queryFn: fetchAllProperties })
  const days = eachDayOfInterval({ start: startOfMonth(cursor), end: endOfMonth(cursor) })

  const filtered = useMemo(
    () =>
      reservations.filter(
        (r) =>
          (propertyId === 'all' ? true : r.property_id === propertyId) &&
          ACTIVE.includes(r.status as (typeof ACTIVE)[number]),
      ),
    [propertyId, reservations],
  )

  return (
    <div className="p-6 md:p-10">
      <Helmet>
        <title>{t('admin.calendar')} | Imperial Home</title>
      </Helmet>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-4xl">{t('admin.calendar')}</h1>
          <p className="mt-2 text-sm theme-muted">{t('admin.calendarLead')}</p>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={() => setCursor(addMonths(cursor, -1))}>
            ‹
          </button>
          <span className="font-display text-xl">{format(cursor, 'MMMM yyyy')}</span>
          <button type="button" onClick={() => setCursor(addMonths(cursor, 1))}>
            ›
          </button>
        </div>
      </div>
      <select className="mt-4 border border-line px-3 py-2" value={propertyId} onChange={(e) => setPropertyId(e.target.value)}>
        <option value="all">{t('admin.calendarAllUnits')}</option>
        {properties.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
      </select>
      <div className="mt-6 grid grid-cols-7 gap-2">
        {days.map((d) => {
          const day = iso(d)
          const hits = filtered.filter((r) => r.check_in <= day && r.check_out > day)
          return (
            <div key={day} className={cn('surface-light min-h-28 border border-line p-2 text-sm', hits.length ? 'border-gold/50' : '')}>
              <p className="text-muted">{d.getDate()}</p>
              {hits.map((h) => (
                <Link
                  key={h.id}
                  to={`/admin/reservations/${h.id}`}
                  className="mt-1 block truncate rounded bg-[#d4af6a]/15 px-1 py-0.5 text-[11px] text-[#d4af6a]"
                  title={`${h.properties?.name ?? ''} · ${h.public_code}`}
                >
                  {h.properties?.name ?? h.public_code}
                </Link>
              ))}
            </div>
          )
        })}
      </div>
    </div>
  )
}
