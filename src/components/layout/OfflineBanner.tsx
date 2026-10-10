import { WifiOff } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useOnline } from '../../hooks/useOnline'

export function OfflineBanner() {
  const online = useOnline()
  const { t } = useTranslation()
  if (online) return null
  return (
    <div
      className="fixed inset-x-0 z-[44] flex items-center justify-center gap-2 bg-[#8a6224] px-3 py-1.5 text-center text-xs font-medium text-white"
      style={{ bottom: 'calc(3.5rem + env(safe-area-inset-bottom))' }}
      role="status"
    >
      <WifiOff className="h-3.5 w-3.5" />
      {t('app.offline')}
    </div>
  )
}
