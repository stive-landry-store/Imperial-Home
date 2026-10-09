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

      <h2 className="mt-14 font-display text-3xl">{t('account.carsTitle')}</h2>
      {cars.isLoading ? <p className="mt-6 theme-muted">{t('common.loading')}</p> : null}
      {!cars.isLoading && (cars.data?.length ?? 0) === 0 ? <p className="mt-6 theme-muted">{t('account.carsEmpty')}</p> : null}
      <ul className="mt-6 space-y-4">
        {(cars.data ?? []).map((rental) => {
          const vehicle = Array.isArray(rental.vehicles) ? rental.vehicles[0] : rental.vehicles
          return (
          <li key={rental.id} className="theme-card p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              {vehicle?.slug ? (
                <Link to={`/cars/${vehicle.slug}`} className="font-display text-2xl hover:text-[#d4af6a]">
                  {rentalVehicleName(rental)}
                </Link>
              ) : (
                <p className="font-display text-2xl">{rentalVehicleName(rental)}</p>
              )}
              <Badge variant="dark">{carStatusLabel(rental.status, t)}</Badge>
            </div>
            <p className="mt-2 text-sm theme-muted">
              {rental.public_code ? `${rental.public_code} · ` : ''}
              {rental.start_date ? formatDate(rental.start_date, locale) : ''}
              {rental.end_date ? ` → ${formatDate(rental.end_date, locale)}` : ''}
              {' · '}
              {rental.with_driver ? t('cars.withDriver') : t('cars.withoutDriver')}
            </p>
            <p className="mt-1 text-sm">{formatXaf(rental.total_xaf)}</p>
          </li>
          )
        })}
      </ul>
    </div>
  )
}
