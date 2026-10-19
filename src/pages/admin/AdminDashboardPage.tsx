import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Helmet } from 'react-helmet-async'
import { useTranslation } from 'react-i18next'
import { CalendarDays, Car, Building2, ClipboardList, ChevronRight } from 'lucide-react'
import { fetchAllReservations, fetchPublishedProperties } from '../../lib/data'
import { supabase } from '../../lib/supabase'
import { todayIso } from '../../lib/availability'
import { formatDate, formatXaf } from '../../lib/format'
import { daysInMonth, nightsInMonth } from '../../lib/occupancy'
import { AdminInsights } from '../../components/admin/AdminInsights'
import { Button } from '../../components/ui/Button'
import { useAuth } from '../../hooks/useAuth'
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
  const { profile } = useAuth()
  const queryClient = useQueryClient()
  const [resetting, setResetting] = useState(false)
  const [resetDone, setResetDone] = useState(false)
  const [resetError, setResetError] = useState<string | null>(null)
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

  const now = new Date()
  const monthIndex = now.getMonth()
  const year = now.getFullYear()
  const monthKey = `${year}-${String(monthIndex + 1).padStart(2, '0')}`
  const occupiedNights = reservations
    .filter((r) => r.status === 'confirmed' || r.status === 'completed')
    .reduce((sum, r) => sum + nightsInMonth(r.check_in, r.check_out, year, monthIndex), 0)
  const occupancyRate = properties.length
    ? Math.round((occupiedNights / (properties.length * daysInMonth(year, monthIndex))) * 100)
    : 0
  const monthRevenue = reservations
    .filter((r) => (r.status === 'confirmed' || r.status === 'completed') && r.check_in.startsWith(monthKey))
    .reduce((sum, r) => sum + r.total_amount_xaf, 0)

  const cards = [
    { label: t('admin.arrivals'), value: arrivals.length },
    { label: t('admin.departures'), value: departures.length },
    { label: t('admin.occupancy'), value: `${active.length}/${properties.length}` },
    { label: t('admin.unread'), value: unread },
    { label: t('admin.revenue'), value: formatXaf(monthRevenue) },
    { label: t('admin.occupancyRate'), value: `${occupancyRate}%` },
  ]

  const canReset = profile?.role === 'super_admin'

  async function resetStatistics() {
    if (!supabase || !canReset || resetting) return
    if (!window.confirm(t('admin.resetStatsConfirm'))) return
    if (!window.confirm(t('admin.resetStatsConfirmAgain'))) return
    setResetting(true)
    setResetError(null)
    setResetDone(false)
    const { error } = await supabase.rpc('reset_client_statistics')
    setResetting(false)
    if (error) {
      setResetError(error.message || t('admin.resetStatsError'))
      return
    }
    setResetDone(true)
    await queryClient.invalidateQueries()
  }

  const shortcuts = [
    { to: '/admin/calendar', label: t('admin.calendar'), icon: CalendarDays },
    { to: '/admin/reservations', label: t('admin.reservations'), icon: ClipboardList },
    { to: '/admin/properties', label: t('admin.properties'), icon: Building2 },
    { to: '/admin/vehicles', label: t('admin.vehicles'), icon: Car },
  ]

  return (
    <div className="px-4 py-5 md:p-10">
      <Helmet>
        <title>{`${t('admin.dashboard')} | Imperial Home`}</title>
      </Helmet>
      <h1 className="font-display text-3xl break-words md:text-4xl">{t('admin.dashboard')}</h1>

      {canReset ? (
        <section id="reset" className="mt-5 rounded-[1.35rem] border border-red-900/40 bg-black/40 p-5">
          <h2 className="font-display text-2xl">{t('admin.resetStats')}</h2>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed theme-muted">{t('admin.resetStatsLead')}</p>
          {resetDone ? <p className="mt-3 text-sm text-emerald-700">{t('admin.resetStatsDone')}</p> : null}
          {resetError ? <p className="mt-3 text-sm text-red-600">{resetError}</p> : null}
          <Button className="mt-4 bg-red-800 text-white hover:bg-red-700" onClick={() => void resetStatistics()} disabled={resetting}>
            {resetting ? t('common.loading') : t('admin.resetStatsButton')}
          </Button>
        </section>
      ) : null}

      <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-3">
        {cards.map((c) => (
          <div key={c.label} className="surface-light h-full min-w-0 border border-[#d4af6a]/30 p-4">
            <p className="text-[0.68rem] leading-snug font-medium tracking-[0.06em] text-muted uppercase">{c.label}</p>
            <p className="stat-figure mt-2 font-display text-[1.35rem] leading-tight text-[var(--surface-fg)]">{c.value}</p>
          </div>
        ))}
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3">
        {shortcuts.map((s) => (
          <Link
            key={s.to}
            to={s.to}
            className="surface-light flex min-h-14 min-w-0 items-center gap-3 border border-[#d4af6a]/30 px-4 py-3 text-[0.72rem] leading-snug font-medium tracking-[0.06em] text-[var(--surface-fg)] uppercase touch-manipulation"
          >
            <s.icon size={20} className="shrink-0 text-[#c4a35a]" />
            <span className="min-w-0 break-words">{s.label}</span>
          </Link>
        ))}
      </div>

      <AdminInsights reservations={reservations} properties={properties} today={today} />

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
