import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Helmet } from 'react-helmet-async'
import { useTranslation } from 'react-i18next'
import { cancelReservation, fetchAllReservations } from '../../lib/data'
import { downloadCsv } from '../../lib/files'
import { formatDate, formatXaf } from '../../lib/format'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import {
  decisionErrorMessage,
  isPendingReservation,
  useAdminReservationActions,
} from '../../hooks/useAdminReservationActions'
import { fetchVehicleRentals, rentalVehicleName, setVehicleRentalStatus, type VehicleRental } from '../../lib/vehicles'
import type { Reservation } from '../../types/database'

type Row =
  | { kind: 'stay'; at: string; reservation: Reservation }
  | { kind: 'car'; at: string; rental: VehicleRental }

export function AdminReservationsPage() {
  const { t, i18n } = useTranslation()
  const client = useQueryClient()
  const stays = useQuery({ queryKey: ['admin-reservations'], queryFn: fetchAllReservations })
  const cars = useQuery({ queryKey: ['vehicle-rentals'], queryFn: fetchVehicleRentals })
  const data = stays.data ?? []
  const { confirm, reject } = useAdminReservationActions()
  const cancelStay = useMutation({
    mutationFn: (id: string) => cancelReservation(id, 'Cancelled by administrator'),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ['admin-reservations'] })
      void client.invalidateQueries({ queryKey: ['unavailable'] })
    },
  })
  const cancelCar = useMutation({
    mutationFn: (id: string) => setVehicleRentalStatus(id, 'cancelled'),
    onSuccess: () => void client.invalidateQueries({ queryKey: ['vehicle-rentals'] }),
  })
  const confirmCar = useMutation({
    mutationFn: (id: string) => setVehicleRentalStatus(id, 'confirmed'),
    onSuccess: () => void client.invalidateQueries({ queryKey: ['vehicle-rentals'] }),
  })
  const locale = i18n.language.startsWith('fr') ? 'fr-FR' : 'en-GB'
  const rows = useMemo<Row[]>(() => {
    const stayRows: Row[] = data.map((reservation) => ({ kind: 'stay', at: reservation.created_at, reservation }))
    const carRows: Row[] = (cars.data ?? []).map((rental) => ({ kind: 'car', at: rental.created_at, rental }))
    return [...stayRows, ...carRows].sort((a, b) => b.at.localeCompare(a.at))
  }, [data, cars.data])

  return (
    <div className="px-4 py-5 md:p-10">
      <Helmet>
        <title>{t('admin.reservations')} | Imperial Home</title>
      </Helmet>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-3xl md:text-4xl">{t('admin.reservations')}</h1>
        <Button
          variant="outline"
          className="px-4 py-2 text-[11px]"
          onClick={() =>
            downloadCsv('imperial-home-reservations.csv', [
              ['code', 'apartment', 'guest', 'check_in', 'check_out', 'status', 'total_xaf'],
              ...data.map((r) => [
                r.public_code,
                r.properties?.name ?? '',
                r.profiles?.full_name || r.profiles?.email || '',
                r.check_in,
                r.check_out,
                r.status,
                String(r.total_amount_xaf),
              ]),
            ])
          }
        >
          {t('admin.exportCsv')}
        </Button>
      </div>
      {confirm.isSuccess ? <p className="mt-3 text-sm text-emerald-700">{t('admin.approveSuccess')}</p> : null}
      {reject.isSuccess ? <p className="mt-3 text-sm text-emerald-700">{t('admin.rejectSuccess')}</p> : null}
      {confirm.isError ? (
        <p className="mt-3 text-sm text-red-600">{decisionErrorMessage(confirm.error, t('admin.approveError'))}</p>
      ) : null}
      {reject.isError ? (
        <p className="mt-3 text-sm text-red-600">{decisionErrorMessage(reject.error, t('admin.rejectError'))}</p>
      ) : null}

      <ul className="mt-6 space-y-3 md:hidden">
        {rows.map((row) =>
          row.kind === 'stay' ? (
            <li key={row.reservation.id} className="surface-light border border-line p-4">
              <Link to={`/admin/reservations/${row.reservation.id}`} className="block min-h-11">
                <p className="font-medium text-gold">{row.reservation.public_code}</p>
                <p className="mt-1 text-sm">{row.reservation.properties?.name}</p>
                <p className="text-sm text-muted">{row.reservation.profiles?.full_name || row.reservation.profiles?.email}</p>
                <p className="mt-1 text-sm">
                  {formatDate(row.reservation.check_in)} → {formatDate(row.reservation.check_out)}
                </p>
                <p className="mt-1 text-sm">
                  {formatXaf(row.reservation.total_amount_xaf)} · {t(`status.${row.reservation.status}`)}
                </p>
              </Link>
              <ReservationActions
                status={row.reservation.status}
                pending={confirm.isPending || reject.isPending || cancelStay.isPending}
                onApprove={() => confirm.mutate(row.reservation.id)}
                onReject={() => {
                  if (window.confirm(t('admin.rejectConfirm'))) reject.mutate(row.reservation.id)
                }}
                onCancel={() => {
                  if (window.confirm(t('admin.cancelReservation'))) cancelStay.mutate(row.reservation.id)
                }}
              />
            </li>
          ) : (
            <li key={row.rental.id} className="surface-light border border-line p-4">
              <p className="font-medium text-gold">{row.rental.public_code ?? t('nav.cars')}</p>
              <p className="mt-1 text-sm">{rentalVehicleName(row.rental)}</p>
              <p className="mt-1 text-sm">
                {row.rental.start_date ? formatDate(row.rental.start_date, locale) : ''}
                {row.rental.end_date ? ` → ${formatDate(row.rental.end_date, locale)}` : ''}
              </p>
              <p className="mt-1 text-sm">
                {formatXaf(row.rental.total_xaf)} · {carStatus(row.rental.status, t)}
              </p>
              <CarActions
                status={row.rental.status}
                pending={confirmCar.isPending || cancelCar.isPending}
                onApprove={() => confirmCar.mutate(row.rental.id)}
                onCancel={() => cancelCar.mutate(row.rental.id)}
              />
            </li>
          ),
        )}
      </ul>

      <div className="surface-light mt-8 hidden overflow-x-auto table-swipe border border-line md:block">
        <table className="min-w-full text-left text-base">
          <thead className="bg-cream text-sm uppercase tracking-wider">
            <tr>
              <th className="px-4 py-3">Code</th>
              <th className="px-4 py-3">Property</th>
              <th className="px-4 py-3">Guest</th>
              <th className="px-4 py-3">Dates</th>
              <th className="px-4 py-3">Amount</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">{t('admin.actions')}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) =>
              row.kind === 'stay' ? (
                <tr key={row.reservation.id} className="border-t border-line">
                  <td className="px-4 py-3">
                    <Link to={`/admin/reservations/${row.reservation.id}`} className="hover:text-gold">
                      {row.reservation.public_code}
                    </Link>
                  </td>
                  <td className="px-4 py-3">{row.reservation.properties?.name}</td>
                  <td className="px-4 py-3">{row.reservation.profiles?.full_name || row.reservation.profiles?.email}</td>
                  <td className="px-4 py-3">
                    {formatDate(row.reservation.check_in)} → {formatDate(row.reservation.check_out)}
                  </td>
                  <td className="px-4 py-3">{formatXaf(row.reservation.total_amount_xaf)}</td>
                  <td className="px-4 py-3">
                    <Badge>{t(`status.${row.reservation.status}`)}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    <ReservationActions
                      status={row.reservation.status}
                      pending={confirm.isPending || reject.isPending || cancelStay.isPending}
                      onApprove={() => confirm.mutate(row.reservation.id)}
                      onReject={() => {
                        if (window.confirm(t('admin.rejectConfirm'))) reject.mutate(row.reservation.id)
                      }}
                      onCancel={() => {
                        if (window.confirm(t('admin.cancelReservation'))) cancelStay.mutate(row.reservation.id)
                      }}
                    />
                  </td>
                </tr>
              ) : (
                <tr key={row.rental.id} className="border-t border-line">
                  <td className="px-4 py-3">{row.rental.public_code ?? t('nav.cars')}</td>
                  <td className="px-4 py-3">{rentalVehicleName(row.rental)}</td>
                  <td className="px-4 py-3">{t('nav.cars')}</td>
                  <td className="px-4 py-3">
                    {row.rental.start_date ? formatDate(row.rental.start_date, locale) : ''}
                    {row.rental.end_date ? ` → ${formatDate(row.rental.end_date, locale)}` : ''}
                  </td>
                  <td className="px-4 py-3">{formatXaf(row.rental.total_xaf)}</td>
                  <td className="px-4 py-3">
                    <Badge>{carStatus(row.rental.status, t)}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    <CarActions
                      status={row.rental.status}
                      pending={confirmCar.isPending || cancelCar.isPending}
                      onApprove={() => confirmCar.mutate(row.rental.id)}
                      onCancel={() => cancelCar.mutate(row.rental.id)}
                    />
                  </td>
                </tr>
              ),
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function carStatus(status: VehicleRental['status'], t: (key: string) => string) {
  if (status === 'requested') return t('cars.pending')
  if (status === 'confirmed') return t('status.confirmed')
  return t('status.cancelled')
}

function ReservationActions({
  status,
  pending,
  onApprove,
  onReject,
  onCancel,
}: {
  status: string
  pending: boolean
  onApprove: () => void
  onReject: () => void
  onCancel: () => void
}) {
  const { t } = useTranslation()
  if (isPendingReservation(status)) {
    return (
      <div className="mt-3 grid grid-cols-2 gap-2 md:mt-0 md:flex md:flex-wrap">
        <Button className="w-full px-3 text-[11px] md:w-auto md:py-1.5 md:text-[10px]" onClick={onApprove} disabled={pending}>
          {t('admin.approveReservation')}
        </Button>
        <Button variant="outline" className="w-full px-3 text-[11px] md:w-auto md:py-1.5 md:text-[10px]" onClick={onReject} disabled={pending}>
          {t('admin.rejectReservation')}
        </Button>
      </div>
    )
  }
  if (status === 'confirmed') {
    return (
      <Button variant="outline" className="mt-3 w-full px-3 text-[11px] md:mt-0 md:w-auto md:py-1.5 md:text-[10px]" onClick={onCancel} disabled={pending}>
        {t('admin.cancelReservation')}
      </Button>
    )
  }
  return null
}

function CarActions({
  status,
  pending,
  onApprove,
  onCancel,
}: {
  status: VehicleRental['status']
  pending: boolean
  onApprove: () => void
  onCancel: () => void
}) {
  const { t } = useTranslation()
  if (status === 'cancelled') return null
  return (
    <div className="mt-3 grid grid-cols-2 gap-2 md:mt-0 md:flex">
      {status === 'requested' ? (
        <Button className="w-full px-3 text-[11px] md:w-auto md:py-1.5 md:text-[10px]" onClick={onApprove} disabled={pending}>
          {t('admin.confirmCar')}
        </Button>
      ) : null}
      <Button variant="outline" className="w-full px-3 text-[11px] md:w-auto md:py-1.5 md:text-[10px]" onClick={onCancel} disabled={pending}>
        {t('admin.cancelCar')}
      </Button>
    </div>
  )
}
