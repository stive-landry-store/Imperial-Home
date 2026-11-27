import { useEffect, useState } from 'react'
import QRCode from 'qrcode'
import { useTranslation } from 'react-i18next'

export function ReservationQr({ reservationId, code }: { reservationId: string; code: string }) {
  const { t } = useTranslation()
  const [src, setSrc] = useState('')

  useEffect(() => {
    const payload = `${window.location.origin}/admin/reservations/${reservationId}`
    void QRCode.toDataURL(payload, { margin: 1, width: 360, color: { dark: '#0a0907', light: '#ffffff' }, errorCorrectionLevel: 'M' }).then(setSrc)
  }, [reservationId])

  if (!src) return null
  return (
    <div className="mt-6 flex flex-col items-center rounded-2xl border border-accent/60 bg-panel p-5 text-center text-panel-fg">
      <p className="font-display text-lg tracking-wider text-accent">{t('app.qrTitle')}</p>
      <p className="mt-1 text-xs theme-muted">{t('app.qrLead')}</p>
      <img src={src} alt={code} className="mt-3 h-52 w-52 rounded-xl bg-white p-2" />
      <p className="mt-2 text-sm tracking-[0.2em] text-accent">{code}</p>
    </div>
  )
}
