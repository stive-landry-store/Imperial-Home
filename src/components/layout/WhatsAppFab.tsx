import { MessageCircle } from 'lucide-react'
import { useSiteConfig } from '../../hooks/useSite'
import { whatsappUrl } from '../../lib/whatsapp'
import { useTranslation } from 'react-i18next'

export function WhatsAppFab({ context }: { context?: string }) {
  const { t } = useTranslation()
  const { data: config } = useSiteConfig()
  const href = whatsappUrl(config?.whatsapp ?? '237674092263', context ?? t('contact.message'))

  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="fixed right-4 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-lg touch-manipulation md:right-6"
      style={{ bottom: 'max(1rem, env(safe-area-inset-bottom))' }}
      aria-label="WhatsApp"
    >
      <MessageCircle className="h-7 w-7" />
    </a>
  )
}
