import { useTranslation } from 'react-i18next'
import { cn } from '../../lib/cn'
import { INSTAGRAM_URL, TIKTOK_URL } from '../../lib/social'

export function SocialLinks({ className, prominent = false }: { className?: string; prominent?: boolean }) {
  const { t } = useTranslation()
  const link = prominent
    ? 'inline-flex min-h-14 flex-1 items-center justify-center bg-[#c4a35a] px-3 text-center text-base font-medium tracking-[0.12em] text-black uppercase touch-manipulation'
    : 'inline-flex min-h-12 min-w-[9.5rem] flex-1 items-center justify-center border-2 border-[#c4a35a] bg-[#c4a35a]/15 px-4 text-base tracking-[0.14em] text-[#e0c57a] uppercase touch-manipulation hover:bg-[#c4a35a] hover:text-black'
  return (
    <div className={cn('flex w-full gap-3', className)}>
      <a className={link} href={INSTAGRAM_URL} target="_blank" rel="noreferrer">
        {t('nav.instagram')}
      </a>
      <a className={link} href={TIKTOK_URL} target="_blank" rel="noreferrer">
        {t('nav.tiktok')}
      </a>
    </div>
  )
}
