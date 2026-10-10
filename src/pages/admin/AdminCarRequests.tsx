import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { formatDate, formatXaf } from '../../lib/format'
import { fetchVehicleRentals, rentalVehicleName, setVehicleRentalStatus, type VehicleRental } from '../../lib/vehicles'
import { Loader } from '../../components/ui/Loader'

function label(status: VehicleRental['status'], t: (key: string) => string) {
  if (status === 'requested') return t('cars.pending')
  if (status === 'confirmed') return t('status.confirmed')
  return t('status.cancelled')
}

export function AdminCarRequests() {
  const { t, i18n } = useTranslation()
  const client = useQueryClient()
  const { data = [], isLoading } = useQuery({ queryKey: ['vehicle-rentals'], queryFn: fetchVehicleRentals })
  const locale = i18n.language.startsWith('fr') ? 'fr-FR' : 'en-GB'
  const update = useMutation({
    mutationFn: ({ id, status }: { id: string; status: VehicleRental['status'] }) => setVehicleRentalStatus(id, status),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ['vehicle-rentals'] })
      void client.invalidateQueries({ queryKey: ['my-car-rentals'] })
    },
  })

  return (
    <section className="surface-light mt-12 border border-line p-4">
      <h2 className="font-display text-2xl">{t('admin.carRequests')}</h2>
      {isLoading ? <Loader size="sm" /> : null}
      {!isLoading && data.length === 0 ? <p className="mt-4 text-sm text-muted">{t('account.carsEmpty')}</p> : null}
      <ul className="mt-4 divide-y divide-line">
        {data.map((rental) => (
          <li key={rental.id} className="flex flex-col gap-3 py-4 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-medium">{rentalVehicleName(rental)}</p>
                <Badge variant="dark">{label(rental.status, t)}</Badge>
              </div>
              <p className="mt-1 text-sm text-muted">
                {rental.public_code ?? rental.id.slice(0, 8)}
                {rental.start_date ? ` · ${formatDate(rental.start_date, locale)}` : ''}
                {rental.end_date ? ` → ${formatDate(rental.end_date, locale)}` : ''}
                {' · '}
                {rental.with_driver ? t('cars.withDriver') : t('cars.withoutDriver')}
                {' · '}
                {formatXaf(rental.total_xaf)}
              </p>
            </div>
            {rental.status === 'requested' ? (
              <div className="flex gap-2">
                <Button
                  type="button"
                  disabled={update.isPending}
                  onClick={() => update.mutate({ id: rental.id, status: 'confirmed' })}
                >
                  {t('admin.confirmCar')}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  disabled={update.isPending}
                  onClick={() => update.mutate({ id: rental.id, status: 'cancelled' })}
                >
                  {t('admin.cancelCar')}
                </Button>
              </div>
            ) : null}
          </li>
        ))}
      </ul>
      {update.error ? <p className="mt-3 text-sm text-red-700">{(update.error as Error).message}</p> : null}
    </section>
  )
}
