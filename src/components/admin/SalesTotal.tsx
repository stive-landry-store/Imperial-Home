import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { CalendarCheck, Moon, Receipt, TrendingUp } from 'lucide-react'
import { formatXaf } from '../../lib/format'
import type { Reservation } from '../../types/database'

const DAY = 86_400_000

function nightsOf(r: Reservation) {
  const nights = Math.round((Date.parse(r.check_out) - Date.parse(r.check_in)) / DAY)
  return Number.isFinite(nights) && nights > 0 ? nights : 0
}

/** Counts from 0 to `value` once, with an ease-out curve. */
function useCountUp(value: number, duration = 1600) {
  const [shown, setShown] = useState(0)
  const from = useRef(0)
  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const start = performance.now()
    const begin = from.current
    let frame = 0
    const tick = (now: number) => {
      const p = reduce ? 1 : Math.min(1, (now - start) / duration)
      const eased = 1 - Math.pow(1 - p, 4)
      const next = Math.round(begin + (value - begin) * eased)
      setShown(next)
      if (p < 1) frame = requestAnimationFrame(tick)
      else from.current = value
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [value, duration])
  return shown
}

export function SalesTotal({ reservations }: { reservations: Reservation[] }) {
  const { t } = useTranslation()
  const sold = reservations.filter((r) => r.status === 'confirmed' || r.status === 'completed')
  const total = sold.reduce((sum, r) => sum + (r.total_amount_xaf || 0), 0)
  const nights = sold.reduce((sum, r) => sum + nightsOf(r), 0)
  const average = sold.length ? Math.round(total / sold.length) : 0

  const now = new Date()
  const months = Array.from({ length: 12 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (11 - i), 1)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    return sold.filter((r) => r.check_in.startsWith(key)).reduce((sum, r) => sum + (r.total_amount_xaf || 0), 0)
  })
  const thisMonth = months[11]
  const lastMonth = months[10]
  const trend = lastMonth > 0 ? Math.round(((thisMonth - lastMonth) / lastMonth) * 100) : null

  const shown = useCountUp(total)

  const W = 300
  const H = 70
  const peak = Math.max(1, ...months)
  const points = months.map((v, i) => [(i / 11) * W, H - 6 - (v / peak) * (H - 14)] as const)
  const line = points.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ')
  const area = `${line} L${W},${H} L0,${H} Z`

  const stats = [
    { icon: CalendarCheck, label: t('app.staysSold'), value: String(sold.length) },
    { icon: Moon, label: t('app.nightsSold'), value: String(nights) },
    { icon: Receipt, label: t('app.avgStay'), value: formatXaf(average) },
    { icon: TrendingUp, label: t('app.thisMonth'), value: formatXaf(thisMonth), trend },
  ]

  return (
    <section className="ih-sales relative mt-5 overflow-hidden rounded-[1.75rem] p-5 text-white md:p-7">
      <div className="ih-sales-glow" aria-hidden />
      <div className="relative flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
        <div className="min-w-0">
          <p className="text-[12px] font-semibold tracking-[0.22em] text-white/75 uppercase">{t('app.salesAll')}</p>
          <p className="ih-count mt-2 font-display text-[2.35rem] leading-none font-medium tracking-tight break-words md:text-6xl">
            {formatXaf(shown)}
          </p>
          <p className="mt-2 text-sm text-white/75">{t('app.salesAllLead')}</p>
        </div>
        <svg viewBox={`0 0 ${W} ${H}`} className="ih-sales-chart h-20 w-full md:h-24 md:w-80" preserveAspectRatio="none" aria-hidden>
          <defs>
            <linearGradient id="ih-sales-area" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0" stopColor="#ffffff" stopOpacity="0.45" />
              <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d={area} fill="url(#ih-sales-area)" className="ih-sales-area" />
          <path d={line} fill="none" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" pathLength={1} className="ih-sales-line" />
          <circle cx={points[11][0] - 2} cy={points[11][1]} r="3.5" fill="#ffffff" className="ih-sales-dot" />
        </svg>
      </div>
      <div className="relative mt-6 grid grid-cols-2 gap-2.5 md:grid-cols-4 md:gap-3">
        {stats.map((s, index) => (
          <div
            key={s.label}
            className="ih-sales-stat rounded-2xl border border-white/20 bg-white/12 p-3.5 backdrop-blur-md"
            style={{ ['--ih-i' as string]: index }}
          >
            <s.icon className="h-4 w-4 text-white/80" />
            <p className="mt-2 text-[15px] leading-tight font-semibold break-words whitespace-nowrap sm:text-lg md:text-xl">{s.value}</p>
            <p className="mt-0.5 flex items-center gap-1.5 text-[12px] text-white/75">
              {s.label}
              {s.trend != null ? (
                <span className={`rounded-full px-1.5 py-px text-[11px] font-semibold ${s.trend >= 0 ? 'bg-emerald-400/25 text-emerald-50' : 'bg-red-400/25 text-red-50'}`}>
                  {s.trend >= 0 ? '+' : ''}
                  {s.trend}%
                </span>
              ) : null}
            </p>
          </div>
        ))}
      </div>
    </section>
  )
}
