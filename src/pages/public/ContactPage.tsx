import { Helmet } from 'react-helmet-async'
import { useTranslation } from 'react-i18next'
import { Button } from '../../components/ui/Button'
import { useSiteConfig } from '../../hooks/useSite'
import { whatsappUrl } from '../../lib/whatsapp'
import { ImperialLogo } from '../../components/brand/Logo'
import { useTheme } from '../../hooks/useTheme'

export function ContactPage() {
  const { t } = useTranslation()
  const { theme } = useTheme()
  const { data: config } = useSiteConfig()
  const wa = whatsappUrl(config?.whatsapp ?? '237674092263', t('contact.message'))

  return (
    <div className="theme-page min-h-svh">
      <div className="mx-auto max-w-3xl px-4 pt-36 pb-24">
        <Helmet>
          <title>{t('contact.title')} | Impérial Home</title>
        </Helmet>
        <ImperialLogo light={theme === 'dark'} />
        <h1 className="mt-10 font-display text-5xl tracking-[0.04em]">{t('contact.title')}</h1>
        <p className="mt-4 max-w-xl text-base theme-muted">{t('contact.lead')}</p>
        <div className="theme-card mt-10 space-y-6 p-8">
          <div>
            <p className="text-[13px] tracking-[0.18em] text-[#d4af6a] uppercase">{t('contact.phone')}</p>
            <p className="mt-2 font-display text-2xl">{config?.phone}</p>
          </div>
          <div>
            <p className="text-[13px] tracking-[0.18em] text-[#d4af6a] uppercase">{t('contact.email')}</p>
            <a className="mt-2 block text-lg hover:text-[#e0c57a]" href={`mailto:${config?.email}`}>
              {config?.email}
            </a>
          </div>
          <p className="text-base theme-muted">{config?.city}</p>
          <Button onClick={() => window.open(wa, '_blank')}>{t('hero.ctaSecondary')}</Button>
        </div>
      </div>
    </div>
  )
}
