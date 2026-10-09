import { Helmet } from 'react-helmet-async'
import { useTranslation } from 'react-i18next'
import { Phone, Shield, Sparkles, Wifi } from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { PropertyCard } from '../../components/property/PropertyCard'
import { PlaceActions } from '../../components/property/PlaceActions'
import { PlaceMap } from '../../components/property/PlaceMap'
import { HousingSheet } from '../../components/housing/HousingSheet'
import { usePublishedProperties, usePromotions, useSiteConfig } from '../../hooks/useSite'
import { SocialLinks } from '../../components/layout/SocialLinks'
import { Live } from '../../components/i18n/Live'
import { imperialPlace } from '../../lib/place'
import { demoHousingSheet } from '../../lib/housingSheet'

export function HomePage() {
  const { t, i18n } = useTranslation()
  const { data: properties = [] } = usePublishedProperties()
  const { data: promotions = [] } = usePromotions()
  const { data: config } = useSiteConfig()
  const featured = properties.slice(0, 3)
  const offer = promotions.find((p) => p.is_active)
  const chosenHero = config?.home_hero_image_url?.trim() || ''
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
        <title>Impérial Home | L&apos;art du soin. L&apos;esprit du détail.</title>
      </Helmet>

      <section className="relative min-h-[100svh] bg-[#1a1612] pt-[4.5rem]">
        <div className="absolute inset-x-0 top-[4.5rem] bottom-0">
          {chosenHero ? (
            <img key={chosenHero} src={chosenHero} alt="" className="absolute inset-0 h-full w-full object-cover object-center" />
          ) : null}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-black/35" />
        </div>
        <div className="relative z-10 flex min-h-[calc(100svh-4.5rem)] flex-col justify-end px-5 pb-24 md:px-10">
          <div className="mx-auto w-full max-w-3xl">
            <h1 className="text-3xl font-semibold text-white md:text-5xl">{t('home.placeLine')}</h1>
            <p className="mt-2 max-w-xl text-sm text-white/85 md:text-base">{t('hero.subtitle')}</p>
            <Button to="/properties" className="mt-5 w-full max-w-xs">
              {t('nav.search')}
            </Button>
            <SocialLinks className="mt-4" prominent />
          </div>
        </div>
      </section>

      <section className="theme-alt border-y border-black/10">
        <div className="mx-auto grid max-w-6xl grid-cols-4 md:px-6">
          {pillars.map((p) => (
            <div key={p.title} className="px-1 py-4 text-center md:px-4 md:py-8">
              <p.icon className="mx-auto mb-2 h-5 w-5 md:h-6 md:w-6" strokeWidth={1.75} />
              <p className="text-[11px] leading-tight font-medium md:text-sm">{p.title}</p>
              <p className="mt-2 hidden text-sm leading-relaxed theme-muted md:block">{p.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="theme-page py-10">
        <div className="mx-auto max-w-6xl px-4 md:px-6">
          <div className="flex items-end justify-between gap-4">
            <h2 className="text-xl font-semibold">{t('home.featured')}</h2>
            <Button to="/properties" variant="ghost" className="hidden md:inline-flex">
              {t('home.viewAll')}
            </Button>
          </div>
          <p className="mt-1 text-sm theme-muted">{t('home.featuredLead')}</p>
          <div className="mt-4 flex gap-3 overflow-x-auto pb-2 md:grid md:grid-cols-3 md:overflow-visible">
            {featured.map((p) => (
              <div key={p.id} className="w-[78%] shrink-0 md:w-auto">
                <PropertyCard property={p} promotions={promotions} lang={i18n.language} />
              </div>
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
        <section className="theme-alt py-8">
          <div className="relative mx-auto max-w-3xl px-4 text-center md:px-6">
            <h2 className="text-xl font-semibold">
              <Live text={offer.name} />
            </h2>
            <p className="mt-2 text-sm leading-relaxed theme-muted">
              <Live text={(i18n.language.startsWith('fr') ? offer.description_fr : offer.description_en) || ''} />
            </p>
            <Button className="mt-4" to="/properties">
              {t('home.viewAll')}
            </Button>
          </div>
        </section>
      ) : null}

      <section className="theme-page overflow-hidden py-10">
        <div className="mx-auto grid max-w-6xl items-center gap-8 px-4 md:grid-cols-2 md:px-6">
          <div>
            <h2 className="text-2xl font-semibold">{t('home.ficheTitle')}</h2>
            <p className="mt-3 text-base leading-relaxed theme-muted">{t('home.ficheBody')}</p>
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
              <div className="pointer-events-none w-[210mm] origin-top-left scale-[0.405]">
                <HousingSheet data={demoHousingSheet()} onChange={() => undefined} role="view" />
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="theme-alt border-y border-black/10 py-10">
        <div className="mx-auto max-w-3xl px-4 text-center md:px-6">
          <p className="text-sm font-medium">{t('hero.tagline')}</p>
          <h2 className="mt-2 text-2xl font-semibold">{t('home.ritualTitle')}</h2>
          <p className="mt-3 text-base leading-relaxed theme-muted">{t('home.ritualBody')}</p>
        </div>
      </section>

      <section className="theme-page py-10">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 md:grid-cols-2 md:px-6">
          <div>
            <h2 className="text-2xl font-semibold">{t('home.placeLine')}</h2>
            <p className="mt-3 max-w-md theme-muted">{t('home.locationBody')}</p>
            <p className="mt-6 text-base text-[#d4af6a]">
              {config?.phone}
              <br />
              {config?.email}
            </p>
            <Button className="mt-8" to="/contact">
              {t('nav.contact')}
            </Button>
          </div>
          <div>
            <PlaceMap latitude={place.latitude} longitude={place.longitude} label={place.label} className="h-72" />
            <PlaceActions place={place} />
          </div>
        </div>
      </section>
    </div>
  )
}
