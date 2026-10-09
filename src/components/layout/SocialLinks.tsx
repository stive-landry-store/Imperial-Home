import { useTranslation } from 'react-i18next'
import { cn } from '../../lib/cn'
import { INSTAGRAM_URL, TIKTOK_URL } from '../../lib/social'

export function SocialLinks({ className }: { className?: string }) {
  const { t } = useTranslation()
  const link =
    'inline-flex min-h-11 items-center justify-center border border-[#d4af6a]/50 px-4 text-[13px] tracking-[0.16em] uppercase text-[#d4af6a] hover:border-[#e0c57a] hover:text-[#e0c57a]'
  return (
    <div className={cn('flex flex-wrap items-center gap-3', className)}>
      <a className={link} href={INSTAGRAM_URL} target="_blank" rel="noreferrer">
        {t('nav.instagram')}
      </a>
      <a className={link} href={TIKTOK_URL} target="_blank" rel="noreferrer">
        {t('nav.tiktok')}
      </a>
    </div>
  )
}