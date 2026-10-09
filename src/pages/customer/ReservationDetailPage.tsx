import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Helmet } from 'react-helmet-async'
import { useTranslation } from 'react-i18next'
import { cancelReservation, fetchReservation } from '../../lib/data'
import { formatDate, formatXaf, localized } from '../../lib/format'
import { Button } from '../../components/ui/Button'
import { Live } from '../../components/i18n/Live'
import { useAuth } from '../../hooks/useAuth'
import { supabase } from '../../lib/supabase'
import { Badge } from '../../components/ui/Badge'
import { publishReview } from '../../lib/guest'
import { downloadInvoice } from '../../lib/invoice'
import { todayIso } from '../../lib/availability'

export function ReservationDetailPage() {
  const { id = '' } = useParams()
  const { t, i18n } = useTranslation()
  const client = useQueryClient()
  const { user } = useAuth()
  const [rating, setRating] = useState(5)
  const [review, setReview] = useState('')
  const [reviewed, setReviewed] = useState(false)
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

  const awaiting = reservation.status === 'pending' || reservation.status === 'payment_processing'

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

      {reservation.status === 'confirmed' || reservation.status === 'completed' ? (
        <div className="theme-card mt-8 border border-[#d4af6a]/50 p-6">
          <h2 className="font-display text-2xl">{t('account.bookingValidated')}</h2>
          <p className="mt-2 text-sm theme-muted">{t('account.bookingValidatedLead')}</p>
          <h3 className="mt-6 font-display text-2xl">{t('plus.guideTitle')}</h3>
          <p className="mt-2 text-sm">
            <Live text={localized(reservation.properties?.guide_en, reservation.properties?.guide_fr, i18n.language)} />
          </p>
          <p className="mt-2 text-sm">
            <Live text={localized(reservation.properties?.access_notes_en, reservation.properties?.access_notes_fr, i18n.language)} />
          </p>
          <Button className="mt-4" variant="outline" onClick={() => downloadInvoice(reservation)}>
            {t('plus.invoice')}
          </Button>
        </div>
      ) : (
        <p className="theme-card mt-8 p-6 text-sm theme-muted">{t('plus.guideLocked')}</p>
      )}

      {awaiting ? (
        <div className="theme-card mt-8 p-6">
          <h2 className="font-display text-2xl">{t('account.awaitingAdmin')}</h2>
          <p className="mt-2 text-sm theme-muted">{t('account.awaitingAdminLead')}</p>
        </div>
      ) : null}

      {(reservation.status === 'confirmed' || reservation.status === 'completed') &&
      reservation.check_out <= todayIso() &&
      user &&
      !reviewed ? (
        <form
          className="theme-card mt-8 space-y-3 p-6"
          onSubmit={(event) => {
            event.preventDefault()
            void publishReview({
              propertyId: reservation.property_id,
              reservationId: reservation.id,
              customerId: user.id,
              rating,
              body: review,
            }).then(() => setReviewed(true))
          }}
        >
          <h2 className="font-display text-2xl">{t('plus.reviewTitle')}</h2>
          <p className="text-sm theme-muted">{t('plus.reviewLead')}</p>
          <input type="number" min={1} max={5} value={rating} onChange={(e) => setRating(Number(e.target.value))} className="w-24 border border-line bg-transparent px-2 py-2" />
          <textarea required minLength={8} value={review} onChange={(e) => setReview(e.target.value)} className="w-full border border-line bg-transparent px-3 py-2" rows={4} />
          <Button type="submit">{t('plus.reviewSend')}</Button>
        </form>
      ) : null}
      {reviewed ? <p className="mt-4 text-sm text-emerald-700">{t('plus.reviewThanks')}</p> : null}

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
