import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Helmet } from 'react-helmet-async'
import { useTranslation } from 'react-i18next'
import { fetchMyReservations } from '../../lib/data'
import { formatDate, formatXaf } from '../../lib/format'
import { Badge } from '../../components/ui/Badge'
import { useAuth } from '../../hooks/useAuth'
import { fetchMyVehicleRentals, rentalVehicleName } from '../../lib/vehicles'

function carStatusLabel(status: string, t: (key: string) => string) {
  if (status === 'requested') return t('cars.pending')
  if (status === 'confirmed') return t('status.confirmed')
  if (status === 'cancelled') return t('status.cancelled')
  return status
}

export function AccountReservationsPage() {
  const { t, i18n } = useTranslation()
  const { user } = useAuth()
  const { data = [], isLoading } = useQuery({ queryKey: ['my-reservations'], queryFn: fetchMyReservations })
  const cars = useQuery({
    queryKey: ['my-car-rentals', user?.id],
    queryFn: () => fetchMyVehicleRentals(user!.id),
    enabled: Boolean(user?.id),
  })
  const locale = i18n.language.startsWith('fr') ? 'fr-FR' : 'en-GB'
  const rows = useMemo(() => {
    const stays = data.map((reservation) => ({ kind: 'stay' as const, at: reservation.created_at, reservation }))
    const rentals = (cars.data ?? []).map((rental) => ({ kind: 'car' as const, at: rental.created_at, rental }))
    return [...stays, ...rentals].sort((a, b) => b.at.localeCompare(a.at))
  }, [data, cars.data])
  const empty = !isLoading && !cars.isLoading && rows.length === 0

  return (
    <div>
      <Helmet>
        <title>{t('account.title')} | Imperial Home</title>
      </Helmet>
      <h1 className="font-display text-4xl">{t('account.title')}</h1>
      {isLoading ? <p className="mt-6 theme-muted">{t('common.loading')}</p> : null}
      {empty ? <p className="mt-6 theme-muted">{t('account.empty')}</p> : null}
      <ul className="mt-8 space-y-4">
        {rows.map((row) =>
          row.kind === 'stay' ? (
            <li key={row.reservation.id}>
              <Link to={`/account/reservations/${row.reservation.id}`} className="theme-card block p-5 hover:border-[#d4af6a]">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-display text-2xl">{row.reservation.properties?.name ?? row.reservation.public_code}</p>
                  <Badge variant="dark">{t(`status.${row.reservation.status}`)}</Badge>
                </div>
                <p className="mt-2 text-sm theme-muted">
                  {formatDate(row.reservation.check_in)} → {formatDate(row.reservation.check_out)} · {row.reservation.guest_count}{' '}
                  {t('property.guests')}
                </p>
                <p className="mt-1 text-sm">{formatXaf(row.reservation.total_amount_xaf)}</p>
              </Link>
            </li>
          ) : (
            <li key={row.rental.id} className="theme-card p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-display text-2xl">{rentalVehicleName(row.rental)}</p>
                <Badge variant="dark">{carStatusLabel(row.rental.status, t)}</Badge>
              </div>
              <p className="mt-2 text-sm theme-muted">
                {row.rental.public_code ? `${row.rental.public_code} · ` : ''}
                {row.rental.start_date ? formatDate(row.rental.start_date, locale) : ''}
                {row.rental.end_date ? ` → ${formatDate(row.rental.end_date, locale)}` : ''}
                {' · '}
                {row.rental.with_driver ? t('cars.withDriver') : t('cars.withoutDriver')}
              </p>
              <p className="mt-1 text-sm">{formatXaf(row.rental.total_xaf)}</p>
            </li>
          ),
        )}
      </ul>
    </div>
  )
}
