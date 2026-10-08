import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Helmet } from 'react-helmet-async'
import { useTranslation } from 'react-i18next'
import { fetchAllReservations } from '../../lib/data'
import { formatDate, formatXaf } from '../../lib/format'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { isPendingReservation, useAdminReservationActions } from '../../hooks/useAdminReservationActions'

export function AdminReservationsPage() {
  const { t } = useTranslation()
  const { data = [] } = useQuery({ queryKey: ['admin-reservations'], queryFn: fetchAllReservations })
  const { confirm, reject } = useAdminReservationActions()

  return (
    <div className="px-4 py-5 md:p-10">
      <Helmet>
        <title>{t('admin.reservations')} | Imperial Home</title>
      </Helmet>
      <h1 className="font-display text-3xl md:text-4xl">{t('admin.reservations')}</h1>

      <ul className="mt-6 space-y-3 md:hidden">
        {data.map((r) => (
          <li key={r.id} className="surface-light border border-line p-4">
            <Link to={`/admin/reservations/${r.id}`} className="block min-h-11">
              <p className="font-medium text-gold">{r.public_code}</p>
              <p className="mt-1 text-sm">{r.properties?.name}</p>
              <p className="text-sm text-muted">{r.profiles?.full_name || r.profiles?.email}</p>
              <p className="mt-1 text-sm">
                {formatDate(r.check_in)} → {formatDate(r.check_out)}
              </p>
              <p className="mt-1 text-sm">
                {formatXaf(r.total_amount_xaf)} · {t(`status.${r.status}`)}
              </p>
            </Link>
            {isPendingReservation(r.status) ? (
              <div className="mt-3 grid grid-cols-2 gap-2">
                <Button className="w-full px-3 text-[11px]" onClick={() => confirm.mutate(r.id)} disabled={confirm.isPending}>
                  {t('admin.approveReservation')}
                </Button>
                <Button
                  variant="outline"
                  className="w-full px-3 text-[11px]"
                  onClick={() => {
                    if (window.confirm(t('admin.rejectConfirm'))) reject.mutate(r.id)
                  }}
                  disabled={reject.isPending}
                >
                  {t('admin.rejectReservation')}
                </Button>
              </div>
            ) : null}
          </li>
        ))}
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
            {data.map((r) => (
              <tr key={r.id} className="border-t border-line">
                <td className="px-4 py-3">
                  <Link to={`/admin/reservations/${r.id}`} className="hover:text-gold">
                    {r.public_code}
                  </Link>
                </td>
                <td className="px-4 py-3">{r.properties?.name}</td>
                <td className="px-4 py-3">{r.profiles?.full_name || r.profiles?.email}</td>
                <td className="px-4 py-3">
                  {formatDate(r.check_in)} → {formatDate(r.check_out)}
                </td>
                <td className="px-4 py-3">{formatXaf(r.total_amount_xaf)}</td>
                <td className="px-4 py-3">
                  <Badge>{t(`status.${r.status}`)}</Badge>
                </td>
                <td className="px-4 py-3">
                  {isPendingReservation(r.status) ? (
                    <div className="flex flex-wrap gap-2">
                      <Button className="px-3 py-1.5 text-[10px]" onClick={() => confirm.mutate(r.id)} disabled={confirm.isPending}>
                        {t('admin.approveReservation')}
                      </Button>
                      <Button
                        variant="outline"
                        className="px-3 py-1.5 text-[10px]"
                        onClick={() => {
                          if (window.confirm(t('admin.rejectConfirm'))) reject.mutate(r.id)
                        }}
                        disabled={reject.isPending}
                      >
                        {t('admin.rejectReservation')}
                      </Button>
                    </div>
                  ) : (
                    <Link to={`/admin/reservations/${r.id}`} className="text-xs uppercase tracking-wider text-gold">
                      {t('admin.view')}
                    </Link>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
