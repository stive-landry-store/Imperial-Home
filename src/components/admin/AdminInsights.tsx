import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { LogIn, LogOut } from 'lucide-react'
import { formatDate, formatXaf } from '../../lib/format'
import { daysInMonth, nightsInMonth } from '../../lib/occupancy'
import type { Property, Reservation } from '../../types/database'

const MONTHS_FR = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc']

function Person({ r }: { r: Reservation }) {
  return (
    <Link to={`/admin/reservations/${r.id}`} className="flex items-center justify-between gap-3 border-b border-line px-4 py-3 last:border-b-0">
      <span className="min-w-0">
        <span className="block truncate font-medium">{r.profiles?.full_name || r.profiles?.email || r.public_code}</span>
        <span className="block truncate text-sm text-muted">{r.properties?.name}</span>
      </span>
      <span className="shrink-0 text-xs text-[#8b6f32]">{r.public_code}</span>
    </Link>
  )
}

export function AdminInsights({ reservations, properties, today }: { reservations: Reservation[]; properties: Property[]; today: string }) {
  const { t } = useTranslation()
  const paid = reservations.filter((r) => r.status === 'confirmed' || r.status === 'completed')
  const arrivals = reservations.filter((r) => r.check_in === today && r.status === 'confirmed')
  const departures = reservations.filter((r) => r.check_out === today && r.status === 'confirmed')

  const now = new Date()
  const months = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1)
    return { key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`, label: MONTHS_FR[d.getMonth()] }
  })
  const revenue = months.map((m) => ({ ...m, total: paid.filter((r) => r.check_in.startsWith(m.key)).reduce((s, r) => s + r.total_amount_xaf, 0) }))
  const max = Math.max(1, ...revenue.map((m) => m.total))

  const byProperty = properties
    .map((p) => {
      const mine = paid.filter((r) => r.property_id === p.id)
      const nights = mine.reduce((s, r) => s + nightsInMonth(r.check_in, r.check_out, now.getFullYear(), now.getMonth()), 0)
      return {
        id: p.id,
        name: p.name,
        revenue: mine.reduce((s, r) => s + r.total_amount_xaf, 0),
        occupancy: Math.round((nights / daysInMonth(now.getFullYear(), now.getMonth())) * 100),
      }
    })
    .sort((a, b) => b.revenue - a.revenue)

  const W = 320
  const H = 140
  const bar = W / revenue.length

  return (
    <div className="mt-8 grid gap-5 lg:grid-cols-2">
      <section>
        <h2 className="font-display text-2xl">{t('app.today')}</h2>
        <div className="surface-light mt-3 overflow-hidden border border-line">
          <p className="flex items-center gap-2 border-b border-line bg-[#d4af6a]/10 px-4 py-2 text-xs tracking-[0.14em] uppercase">
            <LogIn size={14} className="text-[#c4a35a]" />
            {t('admin.arrivals')} ({arrivals.length})
          </p>
          {arrivals.length ? arrivals.map((r) => <Person key={r.id} r={r} />) : <p className="px-4 py-3 text-sm text-muted">{t('app.nobody')}</p>}
          <p className="flex items-center gap-2 border-y border-line bg-[#d4af6a]/10 px-4 py-2 text-xs tracking-[0.14em] uppercase">
            <LogOut size={14} className="text-[#c4a35a]" />
            {t('admin.departures')} ({departures.length})
          </p>
          {departures.length ? departures.map((r) => <Person key={r.id} r={r} />) : <p className="px-4 py-3 text-sm text-muted">{t('app.nobody')}</p>}
        </div>
      </section>

      <section>
        <h2 className="font-display text-2xl">{t('app.revenue6')}</h2>
        <div className="surface-light mt-3 border border-line p-4">
          <svg viewBox={`0 0 ${W} ${H + 28}`} className="w-full" role="img" aria-label={t('app.revenue6')}>
            <defs>
              <linearGradient id="gold-bar" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0" stopColor="#ecd08a" />
                <stop offset="1" stopColor="#8b6f32" />
              </linearGradient>
            </defs>
            {revenue.map((m, i) => {
              const h = Math.round((m.total / max) * H)
              return (
                <g key={m.key}>
                  <rect x={i * bar + 10} y={H - h} width={bar - 20} height={Math.max(h, 2)} rx={4} fill="url(#gold-bar)" />
                  <text x={i * bar + bar / 2} y={H + 16} textAnchor="middle" fontSize="11" fill="currentColor" opacity="0.7">
                    {m.label}
                  </text>
                  {m.total > 0 ? (
                    <text x={i * bar + bar / 2} y={H - h - 4} textAnchor="middle" fontSize="9" fill="currentColor">
                      {Math.round(m.total / 1000)}k
                    </text>
                  ) : null}
                </g>
              )
            })}
          </svg>
          <p className="mt-1 text-right text-xs text-muted">
            {t('app.revenueTotal')} : {formatXaf(revenue.reduce((s, m) => s + m.total, 0))}
          </p>
        </div>
      </section>

      <section className="lg:col-span-2">
        <h2 className="font-display text-2xl">{t('app.byApartment')}</h2>
        <ul className="surface-light mt-3 border border-line">
          {byProperty.map((p, i) => (
            <li key={p.id} className="border-b border-line px-4 py-3 last:border-b-0">
              <div className="flex items-center justify-between gap-3">
                <span className="font-medium">
                  {i === 0 && p.revenue > 0 ? '★ ' : ''}
                  {p.name}
                </span>
                <span className="text-sm">{formatXaf(p.revenue)}</span>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-black/10">
                <div className="h-full rounded-full bg-gradient-to-r from-[#8b6f32] to-[#ecd08a]" style={{ width: `${Math.min(100, p.occupancy)}%` }} />
              </div>
              <p className="mt-1 text-xs text-muted">
                {t('admin.occupancyRate')} : {p.occupancy}% · {formatDate(today)}
              </p>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
