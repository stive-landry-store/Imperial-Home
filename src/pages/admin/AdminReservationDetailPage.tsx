import { useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Helmet } from 'react-helmet-async'
import { useTranslation } from 'react-i18next'
import { cancelReservation, fetchReservation } from '../../lib/data'
import { formatDate, formatXaf } from '../../lib/format'
import { Button } from '../../components/ui/Button'
import { Badge } from '../../components/ui/Badge'
import { isPendingReservation, useAdminReservationActions } from '../../hooks/useAdminReservationActions'

export function AdminReservationDetailPage() {
  const { id = '' } = useParams()
  const { t } = useTranslation()
  const client = useQueryClient()
  const { data: r } = useQuery({ queryKey: ['reservation', id], queryFn: () => fetchReservation(id) })
  const { confirm, reject } = useAdminReservationActions()
  const cancel = useMutation({
    mutationFn: () => cancelReservation(id, 'Cancelled by administrator'),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ['reservation', id] })
      void client.invalidateQueries({ queryKey: ['admin-reservations'] })
      void client.invalidateQueries({ queryKey: ['unavailable'] })
    },
  })

  if (!r) return <p className="p-10">{t('common.loading')}</p>
  const canDecide = isPendingReservation(r.status)

  return (
    <div className="px-4 py-5 md:p-10">
      <Helmet>
        <title>{r.public_code} | Imperial Home</title>
      </Helmet>
      <p className="text-xs uppercase tracking-[0.16em] text-gold">{r.public_code}</p>
      <h1 className="mt-2 font-display text-4xl">{r.properties?.name}</h1>
      <div className="mt-3">
        <Badge>{t(`status.${r.status}`)}</Badge>
      </div>
      {canDecide ? <p className="mt-3 max-w-xl text-sm theme-muted">{t('admin.pendingDecisionLead')}</p> : null}
      <dl className="mt-8 max-w-xl space-y-2 text-sm">
        <div className="flex justify-between">
          <dt>{t('admin.guest')}</dt>
          <dd>{r.profiles?.full_name || r.profiles?.email}</dd>
        </div>
        <div className="flex justify-between">
          <dt>{t('auth.phone')}</dt>
          <dd>{r.profiles?.phone}</dd>
        </div>
        <div className="flex justify-between">
          <dt>{t('admin.dates')}</dt>
          <dd>
            {formatDate(r.check_in)} → {formatDate(r.check_out)}
          </dd>
        </div>
        <div className="flex justify-between">
          <dt>{t('property.guests')}</dt>
          <dd>{r.guest_count}</dd>
        </div>
        <div className="flex justify-between">
          <dt>{t('property.total')}</dt>
          <dd>{formatXaf(r.total_amount_xaf)}</dd>
        </div>
      </dl>
      <div className="mt-8 flex flex-wrap gap-3">
        <Button to={`/admin/reservations/${id}/fiche`}>{t('account.openFiche')}</Button>
        <Button variant="ghost" to="/admin/calendar">
          {t('admin.calendar')}
        </Button>
      </div>
      {canDecide ? (
        <div className="mt-8 grid grid-cols-1 gap-3 sm:flex sm:flex-wrap">
          <Button onClick={() => confirm.mutate(id)} disabled={confirm.isPending}>
            {t('admin.approveReservation')}
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              if (window.confirm(t('admin.rejectConfirm'))) reject.mutate(id)
            }}
            disabled={reject.isPending}
          >
            {t('admin.rejectReservation')}
          </Button>
        </div>
      ) : null}
      {r.status !== 'cancelled' && r.status !== 'completed' ? (
        <div className="mt-6">
          <Button variant="ghost" onClick={() => cancel.mutate()} disabled={cancel.isPending}>
            {t('admin.cancelReservation')}
          </Button>
        </div>
      ) : null}
    </div>
  )
}
