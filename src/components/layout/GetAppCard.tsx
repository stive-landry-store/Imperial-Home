import { Link } from 'react-router-dom'
import { ChevronRight, Smartphone } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { cn } from '../../lib/cn'
import { devicePlatform, isAppInstalled } from '../../lib/installPrompt'

export function GetAppCard({ className, onNavigate }: { className?: string; onNavigate?: () => void }) {
  const { t } = useTranslation()
  if (isAppInstalled()) return null
  const platform = devicePlatform()
  const subtitle = platform === 'ios' ? t('app.forIphone') : platform === 'android' ? t('app.forAndroid') : t('app.forPhone')

  return (
    <Link
      to="/installer"
      onClick={onNavigate}
      className={cn(
        'flex min-h-16 items-center gap-3 rounded-2xl bg-gradient-to-r from-[#b8893b] to-[#ecd08a] px-4 py-3 text-[#17110a] shadow-lg touch-manipulation',
        className,
      )}
    >
      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-black/15">
        <Smartphone className="h-6 w-6" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-base font-semibold">{t('app.guideTitle')}</span>
        <span className="block text-xs opacity-80">{subtitle}</span>
      </span>
      <ChevronRight className="h-5 w-5 shrink-0" />
    </Link>
  )
}
