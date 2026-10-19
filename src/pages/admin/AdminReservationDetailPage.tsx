import { useState } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Helmet } from 'react-helmet-async'
import { useTranslation } from 'react-i18next'
import { cancelReservation, fetchReservation } from '../../lib/data'
import { formatDate, formatXaf } from '../../lib/format'
import { downloadInvoice } from '../../lib/invoice'
import { whatsappUrl } from '../../lib/whatsapp'
import { Button } from '../../components/ui/Button'
import { Badge } from '../../components/ui/Badge'
import { Loader } from '../../components/ui/Loader'
import { CleaningNotice } from '../../components/admin/CleaningNotice'
import {
  decisionErrorMessage,
  isPendingReservation,
  useAdminReservationActions,
} from '../../hooks/useAdminReservationActions'

export function AdminReservationDetailPage() {
  const { id = '' } = useParams()
  const { t } = useTranslation()
  const [params] = useSearchParams()
  const client = useQueryClient()
  const { data: r } = useQuery({ queryKey: ['reservation', id], queryFn: () => fetchReservation(id) })
  const { confirm, reject } = useAdminReservationActions()
  const [receiptBusy, setReceiptBusy] = useState(false)
  const cancel = useMutation({
    mutationFn: () => cancelReservation(id, 'Cancelled by administrator'),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ['reservation', id] })
      void client.invalidateQueries({ queryKey: ['admin-reservations'] })
      void client.invalidateQueries({ queryKey: ['unavailable'] })
    },
  })

  if (!r) return <Loader size="lg" fill />
  const payments = r.payments ?? []
  const paid = payments.some((payment) => payment.status === 'successful') || r.status === 'confirmed' || r.status === 'completed'
  const canDecide = isPendingReservation(r.status)
  const decideNow = canDecide && params.get('do')
  const canNotifyCleaning = r.status === 'confirmed' || r.status === 'completed'

  return (
    <div className="px-4 py-5 md:p-10">
      <Helmet>
        <title>{`${r.public_code} | Imperial Home`}</title>
      </Helmet>
      {decideNow ? (
        <div className="mb-6 border border-[#d4af6a] p-4">
          <p className="font-display text-xl">{t('app.newBooking')}</p>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <Button onClick={() => confirm.mutate(id)} disabled={confirm.isPending}>
              {t('app.acceptNow')}
            </Button>
            <Button variant="outline" onClick={() => reject.mutate(id)} disabled={reject.isPending}>
              {t('app.declineNow')}
            </Button>
          </div>
        </div>
      ) : null}
      <p className="text-xs uppercase tracking-[0.16em] text-gold">{r.public_code}</p>
      <h1 className="mt-2 font-display text-4xl">{r.properties?.name}</h1>
      <div className="mt-3">
        <Badge>{t(`status.${r.status}`)}</Badge>
      </div>
      {canDecide ? <p className="mt-3 max-w-xl text-sm theme-muted">{t('admin.pendingDecisionLead')}</p> : null}
      {confirm.isSuccess ? <p className="mt-3 text-sm text-emerald-700">{t('admin.approveSuccess')}</p> : null}
      {reject.isSuccess ? <p className="mt-3 text-sm text-emerald-700">{t('admin.rejectSuccess')}</p> : null}
      {confirm.isError ? (
        <p className="mt-3 text-sm text-red-600">{decisionErrorMessage(confirm.error, t('admin.approveError'))}</p>
      ) : null}
      {reject.isError ? (
        <p className="mt-3 text-sm text-red-600">{decisionErrorMessage(reject.error, t('admin.rejectError'))}</p>
      ) : null}
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
        <div className="flex justify-between gap-3">
          <dt>{t('property.total')}</dt>
          <dd>{formatXaf(r.total_amount_xaf)}</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt>{t('admin.payment')}</dt>
          <dd className={paid ? 'font-semibold text-emerald-700' : 'font-semibold text-red-700'}>
            {paid ? t('admin.paid') : t('admin.unpaid')}
          </dd>
        </div>
      </dl>
      {r.profiles?.phone ? (
        <div className="mt-5 flex max-w-xl flex-wrap gap-2">
          <a className="rounded-full border border-black/15 px-4 py-2 text-sm" href={`tel:${r.profiles.phone.replace(/\s/g, '')}`}>
            {t('admin.callGuest')}
          </a>
          <a
            className="rounded-full bg-[#1c1914] px-4 py-2 text-sm text-[#f6f1e8]"
            href={whatsappUrl(
              r.profiles.phone,
              `Bonjour ${r.profiles.full_name || ''}, c’est Impérial Home pour votre séjour ${r.public_code}.`,
            )}
            target="_blank"
            rel="noreferrer"
          >
            {t('admin.writeGuest')}
          </a>
          <Button to={`/admin/reservations/${id}/fiche`}>{t('account.openFiche')}</Button>
        </div>
      ) : (
        <div className="mt-5">
          <Button to={`/admin/reservations/${id}/fiche`}>{t('account.openFiche')}</Button>
        </div>
      )}
      <div className="surface-light mt-6 max-w-xl border border-black/10 p-5">
        <h2 className="font-display text-2xl">{t('admin.receipt')}</h2>
        <p className="mt-2 text-sm theme-muted">{paid ? t('admin.paidLead') : t('admin.unpaidLead')}</p>
        <Button
          className="mt-4"
          variant="outline"
          disabled={receiptBusy}
          onClick={() => {
            setReceiptBusy(true)
            void downloadInvoice(r).finally(() => setReceiptBusy(false))
          }}
        >
          {receiptBusy ? t('common.loading') : t('admin.receiptDownload')}
        </Button>
      </div>
      <div className="mt-8 flex flex-wrap gap-3">
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
      {canNotifyCleaning ? <CleaningNotice reservationId={id} defaultDate={r.check_out} /> : null}
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
