import { useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Helmet } from 'react-helmet-async'
import { useTranslation } from 'react-i18next'
import { cancelReservation, fetchReservation } from '../../lib/data'
import { formatDate, formatXaf } from '../../lib/format'
import { Button } from '../../components/ui/Button'
import { useSiteConfig } from '../../hooks/useSite'
import { whatsappUrl } from '../../lib/whatsapp'
import { supabase } from '../../lib/supabase'
import { Badge } from '../../components/ui/Badge'

export function ReservationDetailPage() {
  const { id = '' } = useParams()
  const { t, i18n } = useTranslation()
  const client = useQueryClient()
  const { data: config } = useSiteConfig()
  const cancel = useMutation({
    mutationFn: () => cancelReservation(id, 'Cancelled by customer'),
    onSuccess: () => void client.invalidateQueries({ queryKey: ['reservation', id] }),
  })
  const { data: reservation, isLoading } = useQuery({
    queryKey: ['reservation', id],
    queryFn: () => fetchReservation(id),
  })

  if (isLoading || !reservation) {
    return <p>{t('common.loading')}</p>
  }

  const payment = reservation.payments?.[0]
  const awaiting = reservation.status === 'pending' || reservation.status === 'payment_processing'
  const instructions = i18n.language.startsWith('fr')
    ? config?.payment_instructions_fr
    : config?.payment_instructions_en
  const wa = whatsappUrl(
    config?.whatsapp ?? '237674092263',
    `Imperial Home reservation ${reservation.public_code} — ${formatXaf(reservation.total_amount_xaf)}`,
  )

  async function download(path: string) {
    if (!supabase) return
    const { data } = await supabase.storage.from('documents').createSignedUrl(path, 120)
    if (data?.signedUrl) window.open(data.signedUrl, '_blank')
  }

  return (
    <div>
      <Helmet>
        <title>{reservation.public_code} | Imperial Home</title>
      </Helmet>
      <p className="text-xs uppercase tracking-[0.18em] text-gold">{reservation.public_code}</p>
      <h1 className="mt-2 font-display text-4xl">{reservation.properties?.name}</h1>
      <div className="mt-3">
        <Badge variant="dark">{t(`status.${reservation.status}`)}</Badge>
      </div>
      <p className="mt-4 theme-muted">
        {formatDate(reservation.check_in)} → {formatDate(reservation.check_out)} · {reservation.nights} {t('property.nights')}
      </p>
      <p className="mt-2 text-lg">{formatXaf(reservation.total_amount_xaf)}</p>
      {payment ? <p className="text-sm theme-muted-soft">{t(`status.${payment.status}`)}</p> : null}

      {reservation.status === 'confirmed' ? (
        <div className="theme-card mt-8 border border-[#d4af6a]/50 p-6">
          <h2 className="font-display text-2xl">{t('account.bookingValidated')}</h2>
          <p className="mt-2 text-sm theme-muted">{t('account.bookingValidatedLead')}</p>
        </div>
      ) : null}

      {awaiting ? (
        <div className="theme-card mt-8 p-6">
          <h2 className="font-display text-2xl">{t('booking.payTitle')}</h2>
          <p className="mt-2 text-sm theme-muted">{t('booking.payLead')}</p>
          <p className="mt-4 text-sm">{instructions}</p>
          {reservation.hold_expires_at ? (
            <p className="mt-3 text-xs uppercase tracking-wider theme-muted-soft">
              {t('booking.expires')}: {new Date(reservation.hold_expires_at).toLocaleString()}
            </p>
          ) : null}
          <Button className="mt-6" onClick={() => window.open(wa, '_blank')}>
            {t('booking.sendReceipt')}
          </Button>
        </div>
      ) : null}

      <div className="mt-8 flex flex-wrap gap-3">
        <Button to={`/account/reservations/${reservation.id}/fiche`}>{t('account.openFiche')}</Button>
        {reservation.status !== 'cancelled' && reservation.status !== 'completed' ? (
          <Button variant="outline" onClick={() => cancel.mutate()} disabled={cancel.isPending}>
            {t('booking.cancelReservation')}
          </Button>
        ) : null}
      </div>

      {reservation.documents && reservation.documents.length > 0 ? (
        <div className="mt-8">
          <h2 className="font-display text-2xl">{t('account.documents')}</h2>
          <div className="mt-3 flex flex-wrap gap-3">
            {reservation.documents.map((doc) => (
              <Button key={doc.id} variant="outline" onClick={() => void download(doc.storage_path)}>
                {doc.document_type === 'housing_sheet' ? t('account.housing') : t('account.welcome')}
              </Button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  )
}
