import { useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Helmet } from 'react-helmet-async'
import { useTranslation } from 'react-i18next'
import { cancelReservation, confirmPayment, fetchReservation, rejectPayment } from '../../lib/data'
import { formatDate, formatXaf } from '../../lib/format'
import { Button } from '../../components/ui/Button'
import { Badge } from '../../components/ui/Badge'
import { supabase } from '../../lib/supabase'

export function AdminReservationDetailPage() {
  const { id = '' } = useParams()
  const { t } = useTranslation()
  const client = useQueryClient()
  const { data: r } = useQuery({ queryKey: ['reservation', id], queryFn: () => fetchReservation(id) })
  const confirm = useMutation({
    mutationFn: async () => {
      const result = await confirmPayment(id)
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-documents`
      const token = (await supabase?.auth.getSession())?.data.session?.access_token
      if (token) {
        await fetch(url, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ reservation_id: id }),
        }).catch(() => undefined)
      }
      return result
    },
    onSuccess: () => void client.invalidateQueries({ queryKey: ['reservation', id] }),
  })
  const reject = useMutation({
    mutationFn: () => rejectPayment(id),
    onSuccess: () => void client.invalidateQueries({ queryKey: ['reservation', id] }),
  })
  const cancel = useMutation({
    mutationFn: () => cancelReservation(id, 'Cancelled by administrator'),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ['reservation', id] })
      void client.invalidateQueries({ queryKey: ['admin-reservations'] })
    },
  })

  if (!r) return <p className="p-10">{t('common.loading')}</p>
  const canPay = r.status === 'pending' || r.status === 'payment_processing'

  return (
    <div className="p-6 md:p-10">
      <Helmet>
        <title>{r.public_code} | Imperial Home</title>
      </Helmet>
      <p className="text-xs uppercase tracking-[0.16em] text-gold">{r.public_code}</p>
      <h1 className="mt-2 font-display text-4xl">{r.properties?.name}</h1>
      <div className="mt-3">
        <Badge>{t(`status.${r.status}`)}</Badge>
      </div>
      <dl className="mt-8 max-w-xl space-y-2 text-sm">
        <div className="flex justify-between">
          <dt>Guest</dt>
          <dd>{r.profiles?.full_name || r.profiles?.email}</dd>
        </div>
        <div className="flex justify-between">
          <dt>Phone</dt>
          <dd>{r.profiles?.phone}</dd>
        </div>
        <div className="flex justify-between">
          <dt>Dates</dt>
          <dd>
            {formatDate(r.check_in)} → {formatDate(r.check_out)}
          </dd>
        </div>
        <div className="flex justify-between">
          <dt>Guests</dt>
          <dd>{r.guest_count}</dd>
        </div>
        <div className="flex justify-between">
          <dt>Total</dt>
          <dd>{formatXaf(r.total_amount_xaf)}</dd>
        </div>
      </dl>
      <div className="mt-8 flex flex-wrap gap-3">
        <Button to={`/admin/reservations/${id}/fiche`}>{t('account.openFiche')}</Button>
      </div>
      {canPay ? (
        <div className="mt-8 flex gap-3">
          <Button onClick={() => confirm.mutate()} disabled={confirm.isPending}>
            {t('admin.confirmPay')}
          </Button>
          <Button variant="outline" onClick={() => reject.mutate()} disabled={reject.isPending}>
            {t('admin.rejectPay')}
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
