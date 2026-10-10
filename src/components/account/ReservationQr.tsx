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
    <div className="mt-6 flex flex-col items-center rounded-2xl border border-[#d4af6a]/60 bg-[#0a0907] p-5 text-center text-[#f4eee3]">
      <p className="font-display text-lg tracking-wider text-[#ecd08a]">{t('app.qrTitle')}</p>
      <p className="mt-1 text-xs text-[#a89f90]">{t('app.qrLead')}</p>
      <img src={src} alt={code} className="mt-3 h-52 w-52 rounded-xl bg-white p-2" />
      <p className="mt-2 text-sm tracking-[0.2em] text-[#d4af6a]">{code}</p>
    </div>
  )
}
