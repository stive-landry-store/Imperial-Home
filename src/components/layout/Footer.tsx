import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Phone, Shield, Sparkles, Wifi } from 'lucide-react'
import { useSiteConfig } from '../../hooks/useSite'
import { whatsappUrl } from '../../lib/whatsapp'
import { ImperialLogo } from '../brand/Logo'
import { PreferenceBar } from './PreferenceBar'

export function Footer() {
  const { t } = useTranslation()
  const { data: config } = useSiteConfig()
  const year = new Date().getFullYear()

  const pillars = [
    { icon: Shield, title: t('footer.security'), text: t('footer.securityD') },
    { icon: Wifi, title: t('footer.wifi'), text: t('footer.wifiD') },
    { icon: Sparkles, title: t('footer.housekeeping'), text: t('footer.housekeepingD') },
    { icon: Phone, title: t('footer.assist'), text: t('footer.assistD') },
  ]

  return (
    <footer className="bg-black text-[#d4af6a]">
      <div className="gold-line" />
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 md:grid-cols-4 md:px-6 md:divide-x md:divide-[#d4af6a]/25">
        {pillars.map((p) => (
          <div key={p.title} className="px-2 text-center">
            <p.icon className="mx-auto mb-3 h-6 w-6" strokeWidth={1.4} />
            <p className="text-[13px] tracking-[0.18em] uppercase">{p.title}</p>
            <p className="mt-2 text-sm leading-relaxed text-[#d4af6a]/75">{p.text}</p>
          </div>
        ))}
      </div>
      <div className="gold-line" />
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-6 px-4 py-10 md:flex-row md:justify-between md:px-6">
        <ImperialLogo light />
        <div className="text-center text-base md:text-right">
          <a className="block hover:text-gold-light" href={whatsappUrl(config?.whatsapp ?? '237674092263')}>
            {config?.phone}
          </a>
          <a className="mt-1 block hover:text-gold-light" href={`mailto:${config?.email}`}>
            {config?.email}
          </a>
          <p className="mt-2 text-sm text-[#d4af6a]/70">{config?.city}</p>
        </div>
        <div className="flex flex-col gap-2 text-center text-[13px] tracking-[0.16em] uppercase md:text-right">
          <Link to="/properties" className="hover:text-gold-light">
            {t('nav.residences')}
          </Link>
          <Link to="/contact" className="hover:text-gold-light">
            {t('nav.contact')}
          </Link>
          <Link to="/fiche" className="hover:text-gold-light">
            {t('account.housing')}
          </Link>
          <Link to="/login" className="hover:text-gold-light">
            {t('nav.login')}
          </Link>
        </div>
      </div>
      <p className="pb-4 text-center font-display text-base tracking-[0.18em]">MERCI ET BIENVENUE CHEZ IMPÉRIAL HOME !</p>
      <p className="border-t border-[#d4af6a]/15 py-4 text-center text-[12px] tracking-wider text-[#d4af6a]/50">
        © {year} Impérial Home. {t('footer.rights')}
      </p>
      <div className="flex justify-center pb-6">
        <PreferenceBar />
      </div>
    </footer>
  )
}
