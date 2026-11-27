import { useEffect, useState } from 'react'
import { GetAppCard } from '../../components/layout/GetAppCard'
import { Helmet } from 'react-helmet-async'
import { useTranslation } from 'react-i18next'
import { ArrowRight, Phone, Search, Shield, Sparkles, Wifi } from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { PropertyCard } from '../../components/property/PropertyCard'
import { PlaceActions } from '../../components/property/PlaceActions'
import { LazyPlaceMap as PlaceMap } from '../../components/property/LazyPlaceMap'
import { HousingSheet } from '../../components/housing/HousingSheet'
import { usePublishedProperties, usePromotions, useSiteConfig } from '../../hooks/useSite'
import { SocialLinks } from '../../components/layout/SocialLinks'
import { Live } from '../../components/i18n/Live'
import { imperialPlace } from '../../lib/place'
import { SITE_DESCRIPTION, SITE_ORIGIN, lodgingJsonLd } from '../../lib/seo'
import { demoHousingSheet } from '../../lib/housingSheet'

const bundledHero = `${import.meta.env.BASE_URL}hero-accueil.jpg?v=2`

function readyHero(url: string | null | undefined) {
  if (!url || url.includes('/site/hero-accueil/1791483803854')) return bundledHero
  if (url.includes('hero-accueil.jpg') && !url.includes('v=2')) return bundledHero
  return url
}

export function HomePage() {
  const { t, i18n } = useTranslation()
  const { data: properties = [] } = usePublishedProperties()
  const { data: promotions = [] } = usePromotions()
  const { data: config } = useSiteConfig()
  const featured = properties.slice(0, 3)
  const offer = promotions.find((p) => p.is_active && p.code)
  const [cachedHero] = useState(() => {
    try {
      return readyHero(localStorage.getItem('ih-hero'))
    } catch {
      return bundledHero
    }
  })
  const chosenHero = config?.home_hero_image_url?.trim() || ''
  const hero = config ? readyHero(chosenHero) : cachedHero
  useEffect(() => {
    if (!config) return
    try {
      localStorage.setItem('ih-hero', hero)
    } catch {
      /* ignore private mode */
    }
  }, [config, hero])
  const place = imperialPlace(config)

  const pillars = [
    { icon: Shield, title: t('footer.security'), text: t('footer.securityD') },
    { icon: Wifi, title: t('footer.wifi'), text: t('footer.wifiD') },
    { icon: Sparkles, title: t('footer.housekeeping'), text: t('footer.housekeepingD') },
    { icon: Phone, title: t('footer.assist'), text: t('footer.assistD') },
  ]

  return (
    <div className="theme-page">
      <Helmet>
        <title>Imperial Home | Appartements meublés à Douala</title>
        <meta name="description" content={SITE_DESCRIPTION} />
        <link rel="canonical" href={`${SITE_ORIGIN}/`} />
        <meta property="og:title" content="Imperial Home | Appartements meublés à Douala" />
        <meta property="og:description" content={SITE_DESCRIPTION} />
        <meta property="og:url" content={`${SITE_ORIGIN}/`} />
        <script type="application/ld+json">{JSON.stringify(lodgingJsonLd())}</script>
        <link rel="preload" as="image" href={hero} fetchPriority="high" />
      </Helmet>

      <section className="ih-hero relative px-3 pt-[4.75rem] md:px-6 md:pt-[5.5rem]">
        <div className="ih-hero-frame relative mx-auto min-h-[calc(100svh-9.5rem)] max-w-7xl overflow-hidden rounded-[2rem] bg-[#e9e3d9] md:min-h-[calc(100svh-8rem)] md:rounded-[2.5rem]">
          <div className="ih-hero-parallax absolute inset-0">
            <img
              key={hero}
              src={hero}
              alt=""
              width={1200}
              height={1600}
              decoding="async"
              fetchPriority="high"
              className="hero-still ih-hero-media absolute inset-0 h-full w-full"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#1f1d1a]/75 via-[#1f1d1a]/10 to-transparent" />
          </div>
          <div className="relative z-10 flex min-h-[calc(100svh-9.5rem)] flex-col justify-end p-6 pb-28 md:min-h-[calc(100svh-8rem)] md:p-12 md:pb-32">
            <div className="max-w-3xl">
              <p className="ih-fade-up ih-delay-1 mb-4 inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/15 px-3.5 py-1.5 text-[12px] font-semibold tracking-[0.2em] text-white uppercase backdrop-blur-md">
                <span className="ih-live-dot" aria-hidden />
                {t('hero.kicker')}
              </p>
              <h1 className="ih-no-anim font-display text-[2.6rem] leading-[1.02] font-medium text-white md:text-7xl" aria-label={t('home.placeLine')}>
                {t('home.placeLine')
                  .split(' ')
                  .map((word, index) => (
                    <span key={`${word}-${index}`} className="ih-hero-word" style={{ ['--ih-w' as string]: index }} aria-hidden>
                      {word}{' '}
                    </span>
                  ))}
              </h1>
              <p className="ih-fade-up ih-delay-4 mt-4 max-w-xl text-[15px] leading-relaxed text-white/85 md:text-lg">{t('hero.subtitle')}</p>
            </div>
          </div>
        </div>
        <div className="ih-hero-dock ih-fade-up ih-delay-5 relative z-20 mx-auto -mt-20 max-w-5xl px-2 md:-mt-24 md:px-10">
          <div className="ih-glass flex flex-col gap-4 rounded-[1.75rem] p-4 md:flex-row md:items-center md:gap-6 md:p-5">
            <div className="grid flex-1 grid-cols-3 divide-x divide-[var(--line)] text-center">
              <div className="px-2">
                <p className="ih-count font-display text-2xl font-medium md:text-3xl" data-count={properties.length || undefined}>{properties.length || '—'}</p>
                <p className="mt-0.5 text-[12px] theme-muted">{t('home.featured')}</p>
              </div>
              <div className="px-2">
                <p className="font-display text-2xl font-medium md:text-3xl">24/7</p>
                <p className="mt-0.5 text-[12px] theme-muted">{t('footer.assist')}</p>
              </div>
              <div className="px-2">
                <p className="font-display text-2xl font-medium md:text-3xl">Wi-Fi</p>
                <p className="mt-0.5 text-[12px] theme-muted">{t('footer.wifi')}</p>
              </div>
            </div>
            <Button to="/properties" className="w-full md:w-auto md:px-8">
              <Search className="h-4 w-4" />
              {t('hero.cta')}
            </Button>
          </div>
          <SocialLinks className="mt-5 justify-center" />
        </div>
      </section>

      <div className="theme-page px-4 pt-6 empty:hidden md:hidden">
        <GetAppCard />
      </div>

      <section className="theme-page overflow-hidden py-10 md:py-14" aria-hidden>
        <div className="ih-marquee-mask ih-sd-drift">
          <div className="ih-marquee items-center">
            {[...pillars, ...pillars, ...pillars, ...pillars].map((p, index) => (
              <span key={index} className="inline-flex items-center gap-3 font-display text-2xl text-[var(--page-fg)]/80 italic md:text-4xl">
                <p.icon className="h-5 w-5 text-accent md:h-7 md:w-7" strokeWidth={1.4} />
                {p.title}
                <span className="mx-2 text-accent">✦</span>
              </span>
            ))}
          </div>
        </div>
      </section>

      <section className="theme-page pb-12">
        <div className="mx-auto max-w-6xl px-4 md:px-6">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="ih-eyebrow">{t('hero.kicker')}</p>
              <h2 className="mt-3 text-3xl md:text-5xl">{t('home.featured')}</h2>
              <p className="mt-2 max-w-lg text-sm theme-muted md:text-base">{t('home.featuredLead')}</p>
            </div>
            <Button to="/properties" variant="ghost" className="hidden md:inline-flex">
              {t('home.viewAll')}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
          <div className="ih-rail -mx-4 mt-7 flex items-stretch gap-4 overflow-x-auto px-4 pb-4 md:mx-0 md:grid md:grid-cols-3 md:gap-6 md:overflow-visible md:px-0">
            {featured.map((p) => (
              <div key={p.id} className="flex w-[80%] shrink-0 snap-start md:w-auto">
                <PropertyCard property={p} promotions={promotions} lang={i18n.language} />
              </div>
            ))}
          </div>
          <div className="mt-6 md:hidden">
            <Button to="/properties" variant="ghost" className="w-full">
              {t('home.viewAll')}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </section>

      <section className="theme-page px-3 md:px-6">
        <div className="mx-auto grid max-w-6xl grid-cols-2 gap-3 md:grid-cols-4 md:gap-5">
          {pillars.map((p, index) => (
            <div
              key={p.title}
              data-reveal="up"
              style={{ ['--ih-i' as string]: index }}
              className="ih-pillar rounded-3xl border border-line bg-[var(--page-alt)] p-5 md:p-6"
            >
              <span className="grid h-11 w-11 place-items-center rounded-2xl bg-[var(--card-bg)] text-accent shadow-[var(--shadow-soft)]">
                <p.icon className="h-5 w-5" strokeWidth={1.6} />
              </span>
              <p className="mt-4 text-[15px] font-semibold">{p.title}</p>
              <p className="mt-1 text-sm leading-relaxed theme-muted">{p.text}</p>
            </div>
          ))}
        </div>
      </section>

      {offer ? (
        <section className="theme-page px-3 py-12 md:px-6">
          <div className="ih-offer ih-sd-rise relative mx-auto max-w-5xl overflow-hidden rounded-[2rem] border border-accent/20 bg-accent-soft px-6 py-10 text-center md:py-14">
            <p className="ih-eyebrow justify-center">{t('home.promoTitle')}</p>
            <h2 className="mt-3 text-3xl md:text-4xl">
              <Live text={offer.name} />
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed theme-muted md:text-base">
              <Live text={(i18n.language.startsWith('fr') ? offer.description_fr : offer.description_en) || ''} />
            </p>
            <p className="mx-auto mt-5 w-fit rounded-full border border-dashed border-accent/50 bg-[var(--card-bg)] px-5 py-2 font-mono text-sm font-semibold tracking-[0.2em] text-accent">
              {offer.code}
            </p>
            <Button className="mt-6" to="/properties">
              {t('home.viewAll')}
            </Button>
          </div>
        </section>
      ) : null}

      <section className="theme-page overflow-x-clip py-14 md:py-20">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 md:grid-cols-2 md:px-6">
          <div className="text-center md:text-left">
            <p className="ih-eyebrow">{t('home.ficheKicker')}</p>
            <h2 className="mt-3 text-3xl md:text-5xl">{t('home.ficheTitle')}</h2>
            <p className="mt-4 text-base leading-relaxed theme-muted">{t('home.ficheBody')}</p>
            <div className="mt-7 flex flex-wrap justify-center gap-3 md:justify-start">
              <Button to="/fiche">{t('home.ficheCta')}</Button>
              <Button to="/properties" variant="ghost">
                {t('nav.book')}
              </Button>
            </div>
          </div>
          <div className="ih-tilt ih-sd-tilt mx-auto w-full max-w-[430px]">
            <HousingSheet data={demoHousingSheet()} onChange={() => undefined} role="view" />
          </div>
        </div>
      </section>

      <section className="theme-page px-3 md:px-6">
        <div className="ih-sd-widen relative mx-auto max-w-6xl overflow-hidden rounded-[2rem] bg-[var(--page-alt)] px-6 py-14 text-center md:py-20">
          <div className="ih-orb ih-orb-a" aria-hidden />
          <div className="ih-orb ih-orb-b" aria-hidden />
          <p className="relative font-display text-lg text-accent italic md:text-xl">{t('hero.tagline')}</p>
          <h2 className="relative mx-auto mt-3 max-w-2xl text-3xl md:text-5xl">{t('home.ritualTitle')}</h2>
          <p className="relative mx-auto mt-4 max-w-xl text-base leading-relaxed theme-muted">{t('home.ritualBody')}</p>
        </div>
      </section>

      <section className="theme-page py-14 md:py-20">
        <div className="mx-auto grid max-w-6xl items-center gap-8 px-4 md:grid-cols-[1fr_1.2fr] md:px-6">
          <div>
            <p className="ih-eyebrow">{t('home.locationTitle')}</p>
            <h2 className="mt-3 text-3xl md:text-5xl">{t('home.placeLine')}</h2>
            <p className="mt-4 max-w-md theme-muted">{t('home.locationBody')}</p>
            <div className="mt-6 space-y-1 text-base">
              <p className="font-medium">{config?.phone}</p>
              <p className="theme-muted">{config?.email}</p>
            </div>
            <Button className="mt-8" to="/contact">
              {t('nav.contact')}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
          <div className="ih-sd-rise overflow-hidden rounded-[2rem] border border-line bg-[var(--card-bg)] p-2 shadow-[var(--shadow-soft)]">
            <PlaceMap latitude={place.latitude} longitude={place.longitude} label={place.label} className="h-80 overflow-hidden rounded-[1.6rem]" />
            <div className="px-2 pb-1">
              <PlaceActions place={place} />
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
