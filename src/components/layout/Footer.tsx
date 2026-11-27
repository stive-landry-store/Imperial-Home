import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Phone, Shield, Sparkles, Wifi } from 'lucide-react'
import { useSiteConfig } from '../../hooks/useSite'
import { shareSite } from '../../lib/social'
import { whatsappUrl } from '../../lib/whatsapp'
import { ImperialLogo } from '../brand/Logo'
import { SocialLinks } from './SocialLinks'
import { Live } from '../i18n/Live'
import { isAppInstalled } from '../../lib/installPrompt'
import { CREATOR } from '../../lib/credits'

export function Footer() {
  const { t } = useTranslation()
  const { data: config } = useSiteConfig()
  const year = new Date().getFullYear()
  const [copied, setCopied] = useState(false)

  const pillars = [
    { icon: Shield, title: t('footer.security'), text: t('footer.securityD') },
    { icon: Wifi, title: t('footer.wifi'), text: t('footer.wifiD') },
    { icon: Sparkles, title: t('footer.housekeeping'), text: t('footer.housekeepingD') },
    { icon: Phone, title: t('footer.assist'), text: t('footer.assistD') },
  ]

  return (
    <footer className="ih-footer relative overflow-hidden border-t border-line bg-[var(--page-alt)] text-[var(--page-fg)]">
      <div className="ih-footer-glow" aria-hidden />
      <div className="relative mx-auto grid max-w-6xl grid-cols-2 gap-3 px-4 pt-14 md:grid-cols-4 md:gap-5 md:px-6">
        {pillars.map((p, index) => (
          <div
            key={p.title}
            data-reveal="up"
            style={{ ['--ih-i' as string]: index }}
            className="ih-pillar rounded-3xl border border-line bg-[var(--card-bg)] p-5 text-left shadow-[var(--shadow-soft)]"
          >
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-accent-soft text-accent">
              <p.icon className="h-5 w-5" strokeWidth={1.6} />
            </span>
            <p className="mt-4 text-[15px] font-semibold">{p.title}</p>
            <p className="mt-1 text-sm leading-relaxed theme-muted">{p.text}</p>
          </div>
        ))}
      </div>
      <div className="relative mx-auto grid max-w-6xl gap-10 px-4 py-14 md:grid-cols-[1.4fr_1fr_1fr] md:px-6">
        <div className="flex flex-col items-start gap-5">
          <ImperialLogo />
          <p className="max-w-sm text-sm leading-relaxed theme-muted">{t('home.locationBody')}</p>
          {isAppInstalled() ? null : (
            <Link to="/installer" className="ih-btn ih-btn-primary rounded-full px-5 py-2.5 text-sm font-semibold">
              {t('app.guideTitle')}
            </Link>
          )}
        </div>
        <div className="text-base">
          <p className="ih-eyebrow">{t('nav.contact')}</p>
          <a className="ih-link mt-4 block w-fit font-medium" href={whatsappUrl(config?.whatsapp ?? '237674092263')}>
            {config?.phone}
          </a>
          <a className="ih-link mt-2 block w-fit break-all theme-muted" href={`mailto:${config?.email}`}>
            {config?.email}
          </a>
          <p className="mt-2 text-sm theme-muted-soft">{config?.city}</p>
        </div>
        <nav className="grid grid-cols-2 gap-x-6 gap-y-2.5 text-[15px] md:grid-cols-1">
          <p className="ih-eyebrow col-span-2 mb-2 md:col-span-1">Imperial Home</p>
          {[
            ['/properties', t('nav.residences')],
            ['/contact', t('nav.contact')],
            ['/fiche', t('account.housing')],
            ['/login', t('nav.login')],
            ['/avis', t('reviewsPage.title')],
            ['/a-propos', t('legal.about.title')],
            ['/conditions', t('legal.terms.title')],
            ['/confidentialite', t('legal.privacy.title')],
          ].map(([to, label]) => (
            <Link key={to} to={to} className="ih-link w-fit theme-muted hover:text-accent">
              {label}
            </Link>
          ))}
        </nav>
      </div>
      <div className="relative mx-auto flex max-w-6xl flex-col items-center gap-4 border-t border-line px-4 py-10 text-center">
        <p className="ih-eyebrow">{t('nav.networks')}</p>
        <SocialLinks prominent className="max-w-xl" />
        <button
          type="button"
          className="ih-btn min-h-11 rounded-full border border-line px-5 text-sm font-medium hover:bg-accent-soft hover:text-accent"
          onClick={() =>
            void shareSite().then((result) => {
              if (result === 'copied') {
                setCopied(true)
                window.setTimeout(() => setCopied(false), 2000)
              }
            })
          }
        >
          {copied ? t('nav.copied') : t('nav.share')}
        </button>
      </div>
      <p className="relative pb-6 text-center font-display text-xl italic text-accent">
        <Live text="Merci et bienvenue chez Imperial Home" from="fr" />
      </p>
      <div className="relative border-t border-line py-5 text-center text-[13px] theme-muted-soft">
        <p>© {year} Imperial Home. {t('footer.rights')}</p>
        <p className="mt-2" data-reveal="fade">
          {t('credits.madeBy')}{' '}
          <Link to="/a-propos" className="font-semibold text-accent" title={CREATOR.fullName}>
            {CREATOR.company}
          </Link>
          <span className="sr-only"> — {CREATOR.fullName}</span>
          {' · '}
          <a href={CREATOR.portfolio} target="_blank" rel="noopener" className="ih-link font-semibold text-accent">
            Portfolio
          </a>
        </p>
      </div>
    </footer>
  )
}
