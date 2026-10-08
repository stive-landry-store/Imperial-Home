import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Helmet } from 'react-helmet-async'
import { useTranslation } from 'react-i18next'
import { CalendarDays, Car, Building2, ClipboardList, ChevronRight } from 'lucide-react'
import { fetchAllReservations, fetchPublishedProperties } from '../../lib/data'
import { supabase } from '../../lib/supabase'
import { todayIso } from '../../lib/availability'
import { formatDate, formatXaf } from '../../lib/format'
import { Button } from '../../components/ui/Button'
import { SwipeRail } from '../../components/ui/SwipeRail'
import { decisionErrorMessage, useAdminReservationActions } from '../../hooks/useAdminReservationActions'
import type { Reservation } from '../../types/database'

function PendingSwipeCard({
  r,
  onApprove,
  onReject,
  busy,
}: {
  r: Reservation
  onApprove: () => void
  onReject: () => void
  busy: boolean
}) {
  const { t } = useTranslation()
  const info = (
    <>
      <p className="font-medium">{r.public_code}</p>
      <p className="text-sm text-muted">
        {r.properties?.name} · {formatDate(r.check_in)} → {formatDate(r.check_out)}
      </p>
      <p className="text-sm">{formatXaf(r.total_amount_xaf)}</p>
    </>
  )
  const actions = (
    <>
      <Button className="w-full px-3 text-[12px] md:w-auto" onClick={onApprove} disabled={busy}>
        {t('admin.approveReservation')}
      </Button>
      <Button variant="outline" className="w-full px-3 text-[12px] md:w-auto" onClick={onReject} disabled={busy}>
        {t('admin.rejectReservation')}
      </Button>
    </>
  )

  return (
    <li className="border-b border-line last:border-b-0">
      <div className="hidden items-center justify-between gap-4 px-4 py-4 md:flex">
        <Link to={`/admin/reservations/${r.id}`} className="min-w-0 flex-1 hover:text-gold">
          {info}
        </Link>
        <div className="flex shrink-0 gap-2">{actions}</div>
      </div>

      <div className="md:hidden">
        <div className="table-swipe flex snap-x snap-mandatory overflow-x-auto">
          <div className="w-full min-w-full shrink-0 snap-start px-4 py-4">
            <Link to={`/admin/reservations/${r.id}`} className="block">
              {info}
            </Link>
            <p className="mt-3 flex items-center gap-1 text-[11px] uppercase tracking-[0.14em] text-[#c4a35a]">
              {t('admin.swipeToApprove')}
              <ChevronRight size={14} />
              <ChevronRight size={14} className="-ml-2" />
            </p>
          </div>
          <div className="grid w-full min-w-full shrink-0 snap-start grid-cols-2 gap-2 px-4 py-6">{actions}</div>
        </div>
      </div>
    </li>
  )
}

export function AdminDashboardPage() {
  const { t } = useTranslation()
  const today = todayIso()
  const { confirm, reject } = useAdminReservationActions()
  const { data: reservations = [] } = useQuery({ queryKey: ['admin-reservations'], queryFn: fetchAllReservations })
  const { data: properties = [] } = useQuery({ queryKey: ['properties', 'published'], queryFn: fetchPublishedProperties })
  const { data: unread = 0 } = useQuery({
    queryKey: ['unread-chats'],
    queryFn: async () => {
      if (!supabase) return 0
      const { count } = await supabase.from('conversations').select('*', { count: 'exact', head: true }).eq('needs_human', true)
      return count ?? 0
    },
  })

  const arrivals = reservations.filter((r) => r.check_in === today && r.status === 'confirmed')
  const departures = reservations.filter((r) => r.check_out === today && r.status === 'confirmed')
  const active = reservations.filter((r) => r.status === 'confirmed' && r.check_in <= today && r.check_out > today)
  const pendingPay = reservations.filter((r) => r.status === 'pending' || r.status === 'payment_processing')

  const cards = [
    { label: t('admin.arrivals'), value: arrivals.length },
    { label: t('admin.departures'), value: departures.length },
    { label: t('admin.occupancy'), value: `${active.length}/${properties.length}` },
    { label: t('admin.unread'), value: unread },
  ]

  const shortcuts = [
    { to: '/admin/calendar', label: t('admin.calendar'), icon: CalendarDays },
    { to: '/admin/reservations', label: t('admin.reservations'), icon: ClipboardList },
    { to: '/admin/properties', label: t('admin.properties'), icon: Building2 },
    { to: '/admin/vehicles', label: t('admin.vehicles'), icon: Car },
  ]

  return (
    <div className="px-4 py-5 md:p-10">
      <Helmet>
        <title>{t('admin.dashboard')} | Imperial Home</title>
      </Helmet>
      <h1 className="font-display text-3xl md:text-4xl">{t('admin.dashboard')}</h1>

      <SwipeRail className="mt-6 md:grid-cols-4">
        {cards.map((c) => (
          <div key={c.label} className="surface-light h-full border border-[#d4af6a]/30 p-5">
            <p className="text-sm uppercase tracking-[0.14em] text-muted">{c.label}</p>
            <p className="mt-2 font-display text-4xl text-[var(--surface-fg)]">{c.value}</p>
          </div>
        ))}
      </SwipeRail>

      <SwipeRail className="mt-5 md:grid-cols-4">
        {shortcuts.map((s) => (
          <Link
            key={s.to}
            to={s.to}
            className="surface-light flex min-h-14 items-center gap-3 border border-[#d4af6a]/30 px-4 py-3 text-sm uppercase tracking-[0.12em] text-[var(--surface-fg)] touch-manipulation"
          >
            <s.icon size={20} className="shrink-0 text-[#c4a35a]" />
            {s.label}
          </Link>
        ))}
      </SwipeRail>

      <h2 className="mt-10 font-display text-2xl">{t('admin.pendingQueue')}</h2>
      <p className="mt-1 text-sm theme-muted">{t('admin.pendingQueueLead')}</p>
      {confirm.isSuccess ? <p className="mt-2 text-sm text-emerald-700">{t('admin.approveSuccess')}</p> : null}
      {reject.isSuccess ? <p className="mt-2 text-sm text-emerald-700">{t('admin.rejectSuccess')}</p> : null}
      {confirm.isError ? (
        <p className="mt-2 text-sm text-red-600">{decisionErrorMessage(confirm.error, t('admin.approveError'))}</p>
      ) : null}
      {reject.isError ? (
        <p className="mt-2 text-sm text-red-600">{decisionErrorMessage(reject.error, t('admin.rejectError'))}</p>
      ) : null}
      <p className="mt-1 text-sm text-[#c4a35a] md:hidden">{t('admin.swipeToApprove')}</p>
      <ul className="surface-light mt-4 overflow-hidden border border-line">
        {pendingPay.slice(0, 8).map((r) => (
          <PendingSwipeCard
            key={r.id}
            r={r}
            busy={confirm.isPending || reject.isPending}
            onApprove={() => confirm.mutate(r.id)}
            onReject={() => {
              if (window.confirm(t('admin.rejectConfirm'))) reject.mutate(r.id)
            }}
          />
        ))}
        {pendingPay.length === 0 ? <li className="px-4 py-6 text-muted">{t('admin.noPending')}</li> : null}
      </ul>
    </div>
  )
}
