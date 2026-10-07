import { useQuery } from '@tanstack/react-query'
import { Helmet } from 'react-helmet-async'
import { useTranslation } from 'react-i18next'
import { fetchAllReservations, fetchPublishedProperties } from '../../lib/data'
import { supabase } from '../../lib/supabase'
import { todayIso } from '../../lib/availability'
import { formatXaf } from '../../lib/format'

export function AdminDashboardPage() {
  const { t } = useTranslation()
  const today = todayIso()
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

  return (
    <div className="p-6 md:p-10">
      <Helmet>
        <title>{t('admin.dashboard')} | Imperial Home</title>
      </Helmet>
      <h1 className="font-display text-4xl">{t('admin.dashboard')}</h1>
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => (
          <div key={c.label} className="surface-light border border-[#d4af6a]/30 p-5">
            <p className="text-base uppercase tracking-[0.14em] text-muted">{c.label}</p>
            <p className="mt-2 font-display text-4xl text-[var(--surface-fg)]">{c.value}</p>
          </div>
        ))}
      </div>
      <h2 className="mt-12 font-display text-2xl">{t('admin.payments')}</h2>
      <ul className="surface-light mt-4 divide-y divide-line border border-line">
        {pendingPay.slice(0, 8).map((r) => (
          <li key={r.id} className="flex justify-between px-4 py-3 text-base">
            <span>{r.public_code}</span>
            <span>{formatXaf(r.total_amount_xaf)}</span>
          </li>
        ))}
        {pendingPay.length === 0 ? <li className="px-4 py-6 text-muted">No pending payments</li> : null}
      </ul>
    </div>
  )
}
