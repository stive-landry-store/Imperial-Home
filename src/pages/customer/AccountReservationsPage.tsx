import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Helmet } from 'react-helmet-async'
import { useTranslation } from 'react-i18next'
import { fetchMyReservations } from '../../lib/data'
import { formatDate, formatXaf } from '../../lib/format'
import { Badge } from '../../components/ui/Badge'

export function AccountReservationsPage() {
  const { t } = useTranslation()
  const { data = [], isLoading } = useQuery({ queryKey: ['my-reservations'], queryFn: fetchMyReservations })

  return (
    <div>
      <Helmet>
        <title>{t('account.title')} | Imperial Home</title>
      </Helmet>
      <h1 className="font-display text-4xl">{t('account.title')}</h1>
      {isLoading ? <p className="mt-6 theme-muted">{t('common.loading')}</p> : null}
      {!isLoading && data.length === 0 ? <p className="mt-6 theme-muted">{t('account.empty')}</p> : null}
      <ul className="mt-8 space-y-4">
        {data.map((r) => (
          <li key={r.id}>
            <Link to={`/account/reservations/${r.id}`} className="theme-card block p-5 hover:border-[#d4af6a]">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-display text-2xl">{r.properties?.name ?? r.public_code}</p>
                <Badge variant="dark">{t(`status.${r.status}`)}</Badge>
              </div>
              <p className="mt-2 text-sm theme-muted">
                {formatDate(r.check_in)} → {formatDate(r.check_out)} · {r.guest_count} {t('property.guests')}
              </p>
              <p className="mt-1 text-sm">{formatXaf(r.total_amount_xaf)}</p>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
