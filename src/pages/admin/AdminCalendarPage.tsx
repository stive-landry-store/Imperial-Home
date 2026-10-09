import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Helmet } from 'react-helmet-async'
import { useTranslation } from 'react-i18next'
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  startOfMonth,
  startOfWeek,
} from 'date-fns'
import { enUS, fr } from 'date-fns/locale'
import { fetchAllReservations, fetchAllProperties } from '../../lib/data'
import { cn } from '../../lib/cn'
import { formatDate, formatXaf } from '../../lib/format'
import { Button } from '../../components/ui/Button'
import { Skeleton } from '../../components/ui/Skeleton'
import { buildIcal } from '../../lib/ical'
import { downloadText } from '../../lib/files'
import { fetchIcal } from '../../lib/guest'
import {
  decisionErrorMessage,
  isPendingReservation,
  useAdminReservationActions,
} from '../../hooks/useAdminReservationActions'

function iso(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const BLOCKING = ['pending', 'payment_processing', 'confirmed', 'completed'] as const

export function AdminCalendarPage() {
  const { t, i18n } = useTranslation()
  const locale = i18n.language.startsWith('fr') ? fr : enUS
  const [cursor, setCursor] = useState(new Date())
  const [propertyId, setPropertyId] = useState('all')
  const { confirm, reject } = useAdminReservationActions()
  const { data: reservations = [], isLoading } = useQuery({ queryKey: ['admin-reservations'], queryFn: fetchAllReservations })
  const { data: properties = [] } = useQuery({ queryKey: ['admin-properties'], queryFn: fetchAllProperties })
  const monthStart = startOfMonth(cursor)
  const days = eachDayOfInterval({
    start: startOfWeek(monthStart, { weekStartsOn: 1 }),
    end: endOfWeek(endOfMonth(cursor), { weekStartsOn: 1 }),
  })
  const dow = t('cal.dow', { returnObjects: true }) as string[]

  const filtered = useMemo(
    () =>
      reservations.filter(
        (r) =>
          (propertyId === 'all' ? true : r.property_id === propertyId) &&
          BLOCKING.includes(r.status as (typeof BLOCKING)[number]),
      ),
    [propertyId, reservations],
  )

  const pending = useMemo(
    () => filtered.filter((r) => isPendingReservation(r.status)),
    [filtered],
  )

  return (
    <div className="px-4 py-5 md:p-10">
      <Helmet>
        <title>{t('admin.calendar')} | Imperial Home</title>
      </Helmet>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl md:text-4xl">{t('admin.calendar')}</h1>
          <p className="mt-2 text-sm theme-muted">{t('admin.calendarLead')}</p>
        </div>
        <div className="flex items-center gap-3">
          <button type="button" onClick={() => setCursor(addMonths(cursor, -1))} className="px-2 text-lg text-gold">
            ‹
          </button>
          <span className="font-display text-xl capitalize">{format(cursor, 'MMMM yyyy', { locale })}</span>
          <button type="button" onClick={() => setCursor(addMonths(cursor, 1))} className="px-2 text-lg text-gold">
            ›
          </button>
        </div>
      </div>

      <select className="mt-4 min-h-11 w-full border border-line px-3 py-2 md:w-auto" value={propertyId} onChange={(e) => setPropertyId(e.target.value)}>
        <option value="all">{t('admin.calendarAllUnits')}</option>
        {properties.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
      </select>

      <section className="surface-light mt-6 border border-line p-4">
        <h2 className="font-display text-2xl">{t('admin.pendingQueue')}</h2>
        <p className="mt-1 text-sm theme-muted">{t('admin.pendingQueueLead')}</p>
        {confirm.isSuccess ? <p className="mt-3 text-sm text-emerald-700">{t('admin.approveSuccess')}</p> : null}
        {reject.isSuccess ? <p className="mt-3 text-sm text-emerald-700">{t('admin.rejectSuccess')}</p> : null}
        {confirm.isError ? (
          <p className="mt-3 text-sm text-red-600">{decisionErrorMessage(confirm.error, t('admin.approveError'))}</p>
        ) : null}
        {reject.isError ? (
          <p className="mt-3 text-sm text-red-600">{decisionErrorMessage(reject.error, t('admin.rejectError'))}</p>
        ) : null}
        {pending.length === 0 ? (
          <p className="mt-4 text-sm theme-muted">{t('admin.noPending')}</p>
        ) : (
          <ul className="mt-4 divide-y divide-line">
            {pending.map((r) => (
              <li key={r.id} className="flex flex-col gap-3 py-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <Link to={`/admin/reservations/${r.id}`} className="font-medium text-gold">
                    {r.public_code}
                  </Link>
                  <p className="text-sm">
                    {r.properties?.name} · {r.profiles?.full_name || r.profiles?.email}
                  </p>
                  <p className="text-xs theme-muted">
                    {formatDate(r.check_in)} → {formatDate(r.check_out)} · {formatXaf(r.total_amount_xaf)} · {t(`status.${r.status}`)}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-2 md:flex md:flex-wrap">
                  <Button className="w-full px-4 py-2 text-[11px] md:w-auto" onClick={() => confirm.mutate(r.id)} disabled={confirm.isPending}>
                    {t('admin.approveReservation')}
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full px-4 py-2 text-[11px] md:w-auto"
                    onClick={() => {
                      if (window.confirm(t('admin.rejectConfirm'))) reject.mutate(r.id)
                    }}
                    disabled={reject.isPending}
                  >
                    {t('admin.rejectReservation')}
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {isLoading ? <Skeleton className="mt-6 h-64" /> : null}
      <section className="mt-6 border border-line p-4">
        <h2 className="font-display text-2xl">{t('admin.ical')}</h2>
        <p className="mt-1 text-sm theme-muted">{t('plus.icalLead')}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {properties.map((property) => (
            <Button
              key={property.id}
              variant="outline"
              className="px-3 py-2 text-[11px]"
              onClick={() => {
                void (async () => {
                  const remote = property.ical_token ? await fetchIcal(property.ical_token) : null
                  const body =
                    remote ||
                    buildIcal(
                      property.name,
                      reservations.filter((r) => r.property_id === property.id),
                    )
                  downloadText(`${property.slug}.ics`, body, 'text/calendar')
                })()
              }}
            >
              {property.name}
            </Button>
          ))}
        </div>
      </section>

      <p className="mt-4 text-sm theme-muted md:hidden">{t('admin.swipeHint')}</p>
      <div className="table-swipe mt-2 -mx-4 overflow-x-auto px-4 snap-x md:mx-0 md:overflow-visible md:px-0">
      <div className="min-w-[40rem] snap-start md:min-w-0">
      <div className="grid grid-cols-7 gap-2 text-center text-[11px] uppercase tracking-wider text-gold/80">
        {(Array.isArray(dow) ? dow : ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']).map((d) => (
          <div key={d}>{d}</div>
        ))}
      </div>
      <div className="mt-1 grid grid-cols-7 gap-2">
        {days.map((d) => {
          const day = iso(d)
          const inMonth = d.getMonth() === cursor.getMonth()
          const hits = filtered.filter((r) => r.check_in <= day && r.check_out > day)
          const taken = hits.length > 0
          const awaiting = hits.some((h) => isPendingReservation(h.status))
          return (
            <div
              key={day}
              className={cn(
                'surface-light min-h-32 border p-2 text-sm',
                !inMonth && 'opacity-40',
                awaiting && 'border-amber-700/60 bg-amber-950/10',
                taken && !awaiting && 'border-[#c4a35a] bg-[#8a1c1c]/10',
                !taken && 'border-line',
              )}
            >
              <p
                className={cn(
                  'text-muted',
                  taken && 'font-medium text-[#c4a35a] line-through decoration-[#c4a35a] decoration-2',
                )}
              >
                {d.getDate()}
              </p>
              <p
                className={cn(
                  'mt-1 text-[10px] font-medium tracking-[0.12em] uppercase',
                  taken ? 'text-[#d4af6a]' : 'theme-muted',
                )}
              >
                {awaiting ? t('admin.calendarPending') : taken ? t('cal.reserved') : t('cal.available')}
              </p>
              {hits.map((h) => (
                <Link
                  key={h.id}
                  to={`/admin/reservations/${h.id}`}
                  className="mt-1 block truncate rounded bg-[#d4af6a]/15 px-1 py-0.5 text-[11px] text-[#d4af6a]"
                  title={`${h.properties?.name ?? ''} · ${h.public_code} · ${t(`status.${h.status}`)}`}
                >
                  {h.properties?.name ?? h.public_code}
                  {isPendingReservation(h.status) ? ` · ${t('status.pending')}` : ''}
                </Link>
              ))}
            </div>
          )
        })}
      </div>
      </div>
      </div>

      <ul className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-xs uppercase tracking-wider theme-muted">
        <li className="flex items-center gap-2">
          <span className="inline-block h-2.5 w-2.5 rounded-full border border-line" />
          {t('cal.available')} — {t('admin.calendarAvailableHint')}
        </li>
        <li className="flex items-center gap-2">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-amber-700/80" />
          {t('admin.calendarPending')} — {t('admin.calendarPendingHint')}
        </li>
        <li className="flex items-center gap-2">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-[#8a1c1c]/80" />
          <span className="line-through decoration-[#c4a35a]">{t('cal.reserved')}</span>
          {' — '}
          {t('admin.calendarReservedHint')}
        </li>
      </ul>
    </div>
  )
}
