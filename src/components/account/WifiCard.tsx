import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Copy, Wifi } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { supabase } from '../../lib/supabase'
import { Button } from '../ui/Button'

type WifiData = { wifi_name: string; wifi_password: string }

export function WifiCard({ reservationId }: { reservationId: string }) {
  const { t } = useTranslation()
  const [copied, setCopied] = useState('')
  const { data } = useQuery({
    queryKey: ['reservation', reservationId, 'wifi'],
    queryFn: async () => {
      if (!supabase) return null
      const { data: wifi, error } = await supabase.rpc('guest_wifi', { p_reservation_id: reservationId })
      if (error) return null
      return wifi as WifiData | null
    },
  })
  if (!data) return null

  function copy(value: string, key: string) {
    void navigator.clipboard?.writeText(value)
    setCopied(key)
    window.setTimeout(() => setCopied(''), 1500)
  }

  return (
    <div className="mt-6 border border-[#d4af6a]/40 p-4">
      <p className="flex items-center gap-2 font-display text-lg text-[#d4af6a]">
        <Wifi className="h-5 w-5" />
        {t('app.wifiTitle')}
      </p>
      <dl className="mt-3 space-y-2 text-sm">
        {([
          ['name', t('app.wifiName'), data.wifi_name],
          ['password', t('app.wifiPassword'), data.wifi_password],
        ] as const).map(([key, label, value]) => (
          <div key={key} className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <dt className="text-xs theme-muted">{label}</dt>
              <dd className="truncate text-base font-semibold tracking-wide">{value}</dd>
            </div>
            <button type="button" className="shrink-0 p-2 text-[#d4af6a]" aria-label={label} onClick={() => copy(value, key)}>
              {copied === key ? '✓' : <Copy className="h-4 w-4" />}
            </button>
          </div>
        ))}
      </dl>
      <Button className="mt-3" variant="outline" to={`/account/reservations/${reservationId}/fiche`}>
        {t('app.wifiSeeSheet')}
      </Button>
    </div>
  )
}
