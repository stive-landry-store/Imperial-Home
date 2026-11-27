import { useSiteConfig } from '../../hooks/useSite'
import { whatsappUrl } from '../../lib/whatsapp'
import { useTranslation } from 'react-i18next'

function WhatsAppLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden fill="currentColor">
      <path d="M16.04 3C8.86 3 3.03 8.82 3.03 16c0 2.3.6 4.53 1.75 6.5L3 29l6.68-1.75A12.95 12.95 0 0 0 16.04 29C23.2 29 29 23.18 29 16S23.2 3 16.04 3Zm0 23.64c-1.97 0-3.9-.53-5.58-1.53l-.4-.24-3.96 1.04 1.06-3.86-.26-.4A10.6 10.6 0 0 1 5.4 16c0-5.86 4.77-10.63 10.64-10.63 5.86 0 10.6 4.77 10.6 10.63 0 5.87-4.74 10.64-10.6 10.64Zm5.83-7.96c-.32-.16-1.9-.94-2.19-1.04-.3-.11-.5-.16-.72.16-.21.32-.82 1.04-1 1.25-.19.21-.37.24-.69.08-.32-.16-1.35-.5-2.57-1.59-.95-.85-1.6-1.9-1.78-2.22-.19-.32-.02-.49.14-.65.14-.14.32-.37.48-.56.16-.18.21-.32.32-.53.1-.21.05-.4-.03-.56-.08-.16-.72-1.73-.98-2.37-.26-.62-.52-.54-.72-.55h-.61c-.21 0-.56.08-.85.4-.3.32-1.12 1.09-1.12 2.66 0 1.57 1.14 3.09 1.3 3.3.16.21 2.25 3.43 5.45 4.81.76.33 1.36.53 1.82.67.77.25 1.46.21 2.01.13.61-.09 1.9-.78 2.16-1.53.27-.75.27-1.4.19-1.53-.08-.13-.29-.21-.61-.37Z" />
    </svg>
  )
}

export function WhatsAppFab({ context }: { context?: string }) {
  const { t } = useTranslation()
  const { data: config } = useSiteConfig()
  const href = whatsappUrl(config?.whatsapp ?? '237674092263', context ?? t('contact.message'))

  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="ih-fab ih-fab-wa ih-btn fixed right-4 z-50 flex h-[3.75rem] w-[3.75rem] items-center justify-center rounded-full text-white touch-manipulation md:right-6"
      style={{ bottom: 'max(5.5rem, calc(env(safe-area-inset-bottom) + 4.75rem))' }}
      aria-label="WhatsApp"
    >
      <WhatsAppLogo className="h-8 w-8" />
    </a>
  )
}
