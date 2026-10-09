import { Helmet } from 'react-helmet-async'
import { useTranslation } from 'react-i18next'
import { Button } from '../../components/ui/Button'
import { useSiteConfig } from '../../hooks/useSite'
import { whatsappUrl } from '../../lib/whatsapp'
import { ImperialLogo } from '../../components/brand/Logo'
import { SocialLinks } from '../../components/layout/SocialLinks'
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
        <h1 className="mt-8 text-2xl font-semibold">{t('contact.title')}</h1>
        <p className="mt-2 max-w-xl text-sm theme-muted">{t('contact.lead')}</p>
        <div className="theme-card mt-8 space-y-6 rounded-2xl p-6">
          <div>
            <p className="text-sm theme-muted">{t('contact.phone')}</p>
            <p className="mt-1 text-xl font-semibold">{config?.phone}</p>
          </div>
          <div>
            <p className="text-sm theme-muted">{t('contact.email')}</p>
            <a className="mt-2 block text-lg hover:text-[#e0c57a]" href={`mailto:${config?.email}`}>
              {config?.email}
            </a>
          </div>
          <p className="text-base theme-muted">{config?.city}</p>
          <div>
            <p className="text-sm theme-muted">{t('account.social')}</p>
            <SocialLinks className="mt-3" />
          </div>
          <Button onClick={() => window.open(wa, '_blank')}>{t('hero.ctaSecondary')}</Button>
        </div>
      </div>
    </div>
  )
}
