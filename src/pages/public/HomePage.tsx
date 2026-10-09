import { useState, type FormEvent } from 'react'
import { Helmet } from 'react-helmet-async'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Phone, Shield, Sparkles, Wifi } from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { PropertyCard } from '../../components/property/PropertyCard'
import { HousingSheet } from '../../components/housing/HousingSheet'
import { usePublishedProperties, usePromotions, useSiteConfig } from '../../hooks/useSite'
import { checkOutFromNights, todayIso } from '../../lib/availability'
import { SocialLinks } from '../../components/layout/SocialLinks'
import { Live } from '../../components/i18n/Live'
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
  const chosenHero = config?.home_hero_image_url?.trim() || ''

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

      <div className="pt-[4.5rem]">
        <div className="relative h-56 w-full overflow-hidden bg-[#ebe6dc] md:h-80">
          {chosenHero ? (
            <img key={chosenHero} src={chosenHero} alt="" className="absolute inset-0 h-full w-full object-cover object-center" />
          ) : null}
        </div>
        <form onSubmit={search} className="theme-card relative z-10 mx-auto -mt-8 max-w-3xl rounded-2xl border border-black/10 p-4 shadow-lg">
          <h1 className="text-xl font-semibold">{t('home.placeLine')}</h1>
          <p className="mt-1 text-sm theme-muted">{t('hero.subtitle')}</p>
          <div className="mt-3 grid grid-cols-[minmax(0,1.45fr)_minmax(0,0.7fr)_minmax(0,0.8fr)] gap-2">
            <label className="min-w-0 overflow-hidden rounded-xl border border-black/10 px-2 py-2">
              <span className="block text-[11px] theme-muted">{t('property.checkIn')}</span>
              <input
                type="date"
                value={checkIn}
                onChange={(e) => setCheckIn(e.target.value)}
                className="mt-1 block w-full min-w-0 bg-transparent text-[13px] outline-none"
              />
            </label>
            <label className="min-w-0 rounded-xl border border-black/10 px-2 py-2">
              <span className="block text-[11px] theme-muted">{t('property.nights')}</span>
              <input
                type="number"
                min={1}
                max={365}
                value={nights}
                onChange={(e) => setNights(Math.max(1, Math.min(365, Number(e.target.value) || 1)))}
                className="mt-1 w-full bg-transparent text-sm outline-none"
              />
            </label>
            <label className="min-w-0 rounded-xl border border-black/10 px-2 py-2">
              <span className="block text-[11px] theme-muted">{t('property.guests')}</span>
              <input
                type="number"
                min={1}
                value={guests}
                onChange={(e) => setGuests(Number(e.target.value))}
                className="mt-1 w-full bg-transparent text-sm outline-none"
              />
            </label>
          </div>
          <p className="mt-2 text-xs theme-muted">
            {t('property.checkOut')} : {checkOut}
          </p>
          <Button type="submit" className="mt-3 w-full">
            {t('nav.search')}
          </Button>
          <div className="mt-3">
            <SocialLinks />
          </div>
        </form>
      </div>

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
              <div className="pointer-events-none origin-top-left scale-[0.405]">
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
          <iframe
            title="Douala"
            className="h-72 w-full rounded-2xl border border-black/10"
            src="https://www.openstreetmap.org/export/embed.html?bbox=9.73%2C4.05%2C9.78%2C4.09&layer=mapnik&marker=4.0689%2C9.7568"
          />
        </div>
      </section>
    </div>
  )
}
