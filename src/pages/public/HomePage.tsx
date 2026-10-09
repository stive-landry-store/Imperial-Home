import { useState, type FormEvent } from 'react'
import { Helmet } from 'react-helmet-async'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Phone, Shield, Sparkles, Wifi } from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { PropertyCard } from '../../components/property/PropertyCard'
import { HousingSheet } from '../../components/housing/HousingSheet'
import { usePublishedProperties, usePromotions, useSiteConfig } from '../../hooks/useSite'
import { whatsappUrl } from '../../lib/whatsapp'
import { checkOutFromNights, todayIso } from '../../lib/availability'
import { ImperialMark } from '../../components/brand/Logo'
import { SocialLinks } from '../../components/layout/SocialLinks'
import { Live } from '../../components/i18n/Live'
import { OptimizedImage } from '../../components/ui/OptimizedImage'
import { DEFAULT_HOME_HERO_IMAGE } from '../../lib/config'
import { demoHousingSheet } from '../../lib/housingSheet'

export function HomePage() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const { data: properties = [] } = usePublishedProperties()
  const { data: promotions = [] } = usePromotions()
  const { data: config } = useSiteConfig()
  const featured = properties.slice(0, 3)
  const offer = promotions.find((p) => p.is_active)
  const [checkIn, setCheckIn] = useState(todayIso())
  const [nights, setNights] = useState(2)
  const [guests, setGuests] = useState(2)
  const checkOut = checkOutFromNights(checkIn, nights)
  const heroImage = config?.home_hero_image_url?.trim() || DEFAULT_HOME_HERO_IMAGE

  function search(e: FormEvent) {
    e.preventDefault()
    navigate(`/properties?checkIn=${checkIn}&checkOut=${checkOut}&nights=${nights}&guests=${guests}`)
  }

  const pillars = [
    { icon: Shield, title: t('footer.security'), text: t('footer.securityD') },
    { icon: Wifi, title: t('footer.wifi'), text: t('footer.wifiD') },
    { icon: Sparkles, title: t('footer.housekeeping'), text: t('footer.housekeepingD') },
    { icon: Phone, title: t('footer.assist'), text: t('footer.assistD') },
  ]

  return (
    <div className="theme-page">
      <Helmet>
        <title>Impérial Home | L&apos;art du soin. L&apos;esprit du détail.</title>
      </Helmet>

      <section className="relative flex min-h-[100svh] items-end overflow-hidden">
        <OptimizedImage
          src={heroImage}
          alt=""
          priority
          width={1600}
          className="absolute inset-0 h-full w-full object-cover opacity-55"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-black/25" />
        <div className="relative z-10 mx-auto w-full max-w-6xl px-4 pt-28 pb-8 md:px-6 md:pt-36 md:pb-16">
          <p className="text-[13px] tracking-[0.16em] text-[#d4af6a]">{t('hero.kicker')}</p>
          <ImperialMark className="mt-4 h-20 w-auto md:mt-6 md:h-32" />
          <p className="mt-4 text-[13px] text-[#d4af6a] md:mt-6">{t('hero.tagline')}</p>
          <h1 className="mt-3 max-w-3xl font-display text-3xl leading-[1.1] text-[#f4eee3] md:mt-4 md:text-6xl">
            {t('hero.title')}
          </h1>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-white/80 md:mt-6 md:text-lg">{t('hero.subtitle')}</p>
          <div className="mt-5 flex gap-2 md:mt-8">
            <Button to="/properties" className="min-w-0 flex-1 px-3 text-[11px] sm:flex-none sm:px-5 sm:text-[13px]">
              {t('hero.cta')}
            </Button>
            <Button
              variant="ghost"
              className="min-w-0 flex-1 px-3 text-[11px] sm:flex-none sm:px-5 sm:text-[13px]"
              onClick={() => window.open(whatsappUrl(config?.whatsapp ?? '237674092263', t('contact.message')), '_blank')}
            >
              {t('hero.ctaSecondary')}
            </Button>
          </div>
          <div className="mt-4 max-w-xl md:mt-6">
            <p className="mb-2 text-[12px] text-[#d4af6a]">{t('nav.networks')}</p>
            <SocialLinks prominent />
          </div>

          <form
            onSubmit={search}
            className="mt-5 grid grid-cols-[minmax(0,1.15fr)_3.4rem_4.8rem_auto] overflow-hidden border border-[#d4af6a]/40 bg-[#d4af6a]/10 backdrop-blur-sm md:mt-10 md:grid-cols-4"
          >
            <label className="min-w-0 bg-black/70 px-2 py-2 md:px-4 md:py-4">
              <span className="block text-[10px] leading-tight tracking-[0.06em] text-[#d4af6a] uppercase md:text-[12px]">{t('property.checkIn')}</span>
              <input
                type="date"
                value={checkIn}
                onChange={(e) => setCheckIn(e.target.value)}
                className="mt-1 w-full min-w-0 border-0 bg-transparent text-[13px] text-white outline-none [color-scheme:dark] md:text-base"
              />
            </label>
            <label className="min-w-0 bg-black/70 px-2 py-2 md:px-4 md:py-4">
              <span className="block text-[10px] leading-tight tracking-[0.06em] text-[#d4af6a] uppercase md:text-[12px]">{t('property.nights')}</span>
              <input
                type="number"
                min={1}
                max={365}
                value={nights}
                onChange={(e) => setNights(Math.max(1, Math.min(365, Number(e.target.value) || 1)))}
                className="mt-1 w-full min-w-0 border-0 bg-transparent text-[13px] text-white outline-none md:text-base"
              />
              <span className="mt-1 hidden text-[11px] text-white/50 md:block">
                {t('property.checkOut')} : {checkOut}
              </span>
            </label>
            <label className="min-w-0 bg-black/70 px-2 py-2 md:px-4 md:py-4">
              <span className="block text-[9px] leading-tight tracking-normal text-[#d4af6a] uppercase md:text-[12px] md:tracking-[0.06em]">{t('property.guests')}</span>
              <input
                type="number"
                min={1}
                value={guests}
                onChange={(e) => setGuests(Number(e.target.value))}
                className="mt-1 w-full min-w-0 border-0 bg-transparent text-[13px] text-white outline-none md:text-base"
              />
            </label>
            <Button type="submit" className="rounded-none px-3 text-[11px] md:px-5 md:text-[13px]">
              {t('nav.book')}
            </Button>
          </form>
        </div>
      </section>

      <section className="theme-alt border-y border-[#d4af6a]/20">
        <div className="mx-auto grid max-w-6xl grid-cols-4 md:px-6 md:divide-x md:divide-[#d4af6a]/25">
          {pillars.map((p) => (
            <div key={p.title} className="px-1 py-4 text-center md:px-4 md:py-10">
              <p.icon className="mx-auto mb-2 h-5 w-5 text-[#d4af6a] md:h-6 md:w-6" strokeWidth={1.4} />
              <p className="text-[10px] leading-tight text-[#d4af6a] uppercase md:text-[13px] md:tracking-[0.14em]">{p.title}</p>
              <p className="mt-2 hidden text-sm leading-relaxed theme-muted md:block">{p.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="theme-page py-20">
        <div className="mx-auto max-w-6xl px-4 md:px-6">
          <p className="text-[13px] tracking-[0.32em] text-[#d4af6a] uppercase">{t('home.featured')}</p>
          <div className="mt-3 flex items-end justify-between gap-4">
            <h2 className="max-w-xl font-display text-3xl tracking-[0.04em] md:text-5xl">{t('home.featuredLead')}</h2>
            <Button to="/properties" variant="ghost" className="hidden md:inline-flex">
              {t('home.viewAll')}
            </Button>
          </div>
          <div className="mt-12 grid gap-5 md:grid-cols-3">
            {featured.map((p) => (
              <PropertyCard key={p.id} property={p} promotions={promotions} lang={i18n.language} />
            ))}
          </div>
          <div className="mt-10 md:hidden">
            <Button to="/properties" variant="ghost">
              {t('home.viewAll')}
            </Button>
          </div>
        </div>
      </section>

      {offer ? (
        <section className="relative overflow-hidden py-20">
          <img
            src="https://images.unsplash.com/photo-1616594039964-ae9021a400a0?auto=format&fit=crop&w=2000&q=80"
            alt=""
            className="absolute inset-0 h-full w-full object-cover opacity-30"
          />
          <div className="absolute inset-0 bg-black/70" />
          <div className="relative mx-auto max-w-3xl px-6 text-center">
            <p className="text-[13px] tracking-[0.32em] text-[#d4af6a] uppercase">{t('home.promoTitle')}</p>
            <h2 className="mt-4 font-display text-4xl text-[#f4eee3] md:text-5xl">
              <Live text={offer.name} />
            </h2>
            <p className="mt-5 text-base leading-relaxed text-[#f4eee3]/90">
              <Live text={(i18n.language.startsWith('fr') ? offer.description_fr : offer.description_en) || ''} />
            </p>
            <Button className="mt-8" to="/properties">
              {t('home.viewAll')}
            </Button>
          </div>
        </section>
      ) : null}

      <section className="theme-page overflow-hidden py-20">
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 md:grid-cols-2 md:px-6">
          <div>
            <p className="text-[13px] tracking-[0.32em] text-[#d4af6a] uppercase">{t('home.ficheKicker')}</p>
            <h2 className="mt-4 font-display text-4xl md:text-5xl">{t('home.ficheTitle')}</h2>
            <p className="mt-5 text-base leading-relaxed theme-muted">{t('home.ficheBody')}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button to="/fiche">{t('home.ficheCta')}</Button>
              <Button to="/properties" variant="ghost">
                {t('nav.book')}
              </Button>
            </div>
          </div>
          <div className="relative mx-auto h-[440px] w-full max-w-[320px] overflow-hidden border border-[#d4af6a]/35 bg-white shadow-[0_24px_80px_rgba(0,0,0,0.45)]">
            {config?.home_fiche_image_url ? (
              <img
                src={config.home_fiche_image_url}
                alt={t('home.ficheTitle')}
                className="h-full w-full object-cover object-top"
              />
            ) : (
              <div className="pointer-events-none origin-top-left scale-[0.405]">
                <HousingSheet data={demoHousingSheet()} onChange={() => undefined} role="view" />
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="theme-alt border-y border-[#d4af6a]/20 py-20">
        <div className="mx-auto max-w-3xl px-6 text-center">
          <p className="text-[13px] tracking-[0.32em] text-[#d4af6a] uppercase">{t('hero.tagline')}</p>
          <h2 className="mt-4 font-display text-3xl md:text-5xl">{t('home.ritualTitle')}</h2>
          <p className="mt-6 text-base leading-relaxed theme-muted">{t('home.ritualBody')}</p>
        </div>
      </section>

      <section className="theme-page py-20">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 md:grid-cols-2 md:px-6">
          <div>
            <p className="text-[13px] tracking-[0.32em] text-[#d4af6a] uppercase">{t('home.locationTitle')}</p>
            <h2 className="mt-3 font-display text-4xl">{config?.city}</h2>
            <p className="mt-4 max-w-md theme-muted">{t('home.locationBody')}</p>
            <p className="mt-6 text-base text-[#d4af6a]">
              {config?.phone}
              <br />
              {config?.email}
            </p>
            <Button className="mt-8" to="/contact">
              {t('nav.contact')}
            </Button>
          </div>
          <iframe
            title="Douala"
            className="h-80 w-full border border-[#d4af6a]/30 grayscale"
            src="https://www.openstreetmap.org/export/embed.html?bbox=9.65%2C4.00%2C9.82%2C4.10&layer=mapnik&marker=4.0511%2C9.7679"
          />
        </div>
      </section>
    </div>
  )
}
