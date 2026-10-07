import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Helmet } from 'react-helmet-async'
import { useTranslation } from 'react-i18next'
import { fetchAllReservations } from '../../lib/data'
import { formatDate, formatXaf } from '../../lib/format'
import { Badge } from '../../components/ui/Badge'

export function AdminReservationsPage() {
  const { t } = useTranslation()
  const { data = [] } = useQuery({ queryKey: ['admin-reservations'], queryFn: fetchAllReservations })

  return (
    <div className="p-6 md:p-10">
      <Helmet>
        <title>{t('admin.reservations')} | Imperial Home</title>
      </Helmet>
      <h1 className="font-display text-4xl">{t('admin.reservations')}</h1>
      <div className="surface-light mt-8 overflow-x-auto border border-line">
        <table className="min-w-full text-left text-base">
          <thead className="bg-cream text-sm uppercase tracking-wider">
            <tr>
              <th className="px-4 py-3">Code</th>
              <th className="px-4 py-3">Property</th>
              <th className="px-4 py-3">Guest</th>
              <th className="px-4 py-3">Dates</th>
              <th className="px-4 py-3">Amount</th>
              <th className="px-4 py-3">Status</th>
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
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
