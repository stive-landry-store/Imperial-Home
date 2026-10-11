import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '../ui/Button'
import { publishReview } from '../../lib/guest'
import { haptic } from '../../lib/haptics'

export function ReviewForm({
  propertyId,
  reservationId,
  customerId,
  onDone,
}: {
  propertyId: string
  reservationId: string
  customerId: string
  onDone: () => void
}) {
  const { t } = useTranslation()
  const [rating, setRating] = useState(5)
  const [body, setBody] = useState('')
  const [files, setFiles] = useState<File[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const previews = useMemo(() => files.map((file) => URL.createObjectURL(file)), [files])

  useEffect(() => () => previews.forEach((url) => URL.revokeObjectURL(url)), [previews])

  return (
    <form
      className="theme-card mt-8 space-y-3 p-6"
      onSubmit={(event) => {
        event.preventDefault()
        setBusy(true)
        setError('')
        publishReview({ propertyId, reservationId, customerId, rating, body, photos: files })
          .then(onDone)
          .catch((err: Error) => setError(err.message))
          .finally(() => setBusy(false))
      }}
    >
      <h2 className="font-display text-2xl">{t('plus.reviewTitle')}</h2>
      <p className="text-sm theme-muted">{t('plus.reviewLead')}</p>
      <div className="flex gap-1" role="radiogroup">
        {[1, 2, 3, 4, 5].map((value) => (
          <button
            key={value}
            type="button"
            aria-label={`${value}/5`}
            className={`text-3xl leading-none ${value <= rating ? 'text-[#d4af6a]' : 'text-[#d4af6a]/30'}`}
            onClick={() => {
              setRating(value)
              haptic(10)
            }}
          >
            ★
          </button>
        ))}
      </div>
      <textarea required minLength={8} value={body} onChange={(e) => setBody(e.target.value)} className="w-full border border-line bg-transparent px-3 py-2" rows={4} />
      <div>
        <label className="inline-block cursor-pointer border border-[#d4af6a]/50 px-4 py-2 text-xs tracking-[0.16em] text-[#d4af6a] uppercase">
          {t('app.addPhotos')}
          <input
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(event) => {
              const picked = Array.from(event.target.files ?? [])
              setFiles((current) => [...current, ...picked].slice(0, 4))
              event.target.value = ''
            }}
          />
        </label>
        {previews.length ? (
          <div className="mt-3 flex gap-2">
            {previews.map((url, index) => (
              <div key={url} className="relative h-16 w-16">
                <img src={url} alt="" className="h-full w-full object-cover" />
                <button
                  type="button"
                  aria-label="remove"
                  className="absolute -top-2 -right-2 h-5 w-5 rounded-full bg-black text-xs text-[#d4af6a]"
                  onClick={() => setFiles((current) => current.filter((_, i) => i !== index))}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        ) : null}
      </div>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      <Button type="submit" disabled={busy}>
        {t('plus.reviewSend')}
      </Button>
    </form>
  )
}
