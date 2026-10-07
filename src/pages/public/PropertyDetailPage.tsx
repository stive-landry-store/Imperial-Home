import { useMemo, useState } from 'react'
import { Helmet } from 'react-helmet-async'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { PropertyGallery } from '../../components/property/PropertyGallery'
import { AvailabilityCalendar } from '../../components/booking/AvailabilityCalendar'
import { Button } from '../../components/ui/Button'
import { fetchPropertyBySlug, fetchQuote, fetchUnavailableRanges } from '../../lib/data'
import { checkOutFromNights, nightsBetween, todayIso } from '../../lib/availability'
import { formatXaf, localized } from '../../lib/format'
import { useAuth } from '../../hooks/useAuth'
import { useSiteConfig } from '../../hooks/useSite'

export function PropertyDetailPage() {
  const { slug = '' } = useParams()
  const [params] = useSearchParams()
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { data: config } = useSiteConfig()
  const { data: property, isLoading } = useQuery({
    queryKey: ['property', slug],
    queryFn: () => fetchPropertyBySlug(slug),
  })
  const initialCheckIn = params.get('checkIn') || todayIso()
  const initialNights = params.get('nights')
    ? Math.max(1, Number(params.get('nights')) || 1)
    : params.get('checkOut')
      ? Math.max(1, nightsBetween(initialCheckIn, params.get('checkOut')!))
      : 2
  const [checkIn, setCheckIn] = useState(initialCheckIn)
  const [nights, setNights] = useState(initialNights)
  const [guests, setGuests] = useState(Number(params.get('guests') ?? 2) || 1)
  const checkOut = checkOutFromNights(checkIn, nights)

  const { data: ranges = [] } = useQuery({
    queryKey: ['unavailable', property?.id],
    queryFn: () => fetchUnavailableRanges(property!.id),
    enabled: Boolean(property?.id),
  })

  const { data: quote } = useQuery({
    queryKey: ['quote', property?.id, checkIn, checkOut, guests],
    queryFn: () => fetchQuote(property!, checkIn, checkOut, guests),
    enabled: Boolean(property && checkIn && checkOut),
  })

  const description = useMemo(
    () => (property ? localized(property.description_en, property.description_fr, i18n.language) : ''),
    [property, i18n.language],
  )

  function onSelectDate(iso: string) {
    if (!checkIn || iso <= checkIn) {
      setCheckIn(iso)
      return
    }
    setNights(Math.max(1, nightsBetween(checkIn, iso)))
  }

  if (isLoading) {
    return <p className="theme-page px-6 pt-32 text-[#d4af6a]">{t('common.loading')}</p>
  }
  if (!property) {
    return <p className="theme-page px-6 pt-32">{t('properties.notFound')}</p>
  }

  const maps =
    property.latitude && property.longitude
      ? `https://www.openstreetmap.org/export/embed.html?bbox=${Number(property.longitude) - 0.03}%2C${Number(property.latitude) - 0.02}%2C${Number(property.longitude) + 0.03}%2C${Number(property.latitude) + 0.02}&layer=mapnik&marker=${property.latitude}%2C${property.longitude}`
      : null

  return (
    <div className="theme-page">
      <div className="mx-auto max-w-6xl px-4 pt-32 pb-20 md:px-6">
        <Helmet>
          <title>{property.name} | Impérial Home</title>
          <meta name="description" content={description.slice(0, 160)} />
        </Helmet>
        <PropertyGallery images={property.property_images ?? []} lang={i18n.language} />
        <div className="mt-10 grid gap-12 lg:grid-cols-[1.15fr_0.85fr]">
          <div>
            <p className="text-[13px] tracking-[0.28em] text-[#d4af6a] uppercase">{t('properties.houseLabel')}</p>
            <h1 className="mt-2 font-display text-5xl tracking-[0.04em]">{property.name}</h1>
            <p className="mt-4 max-w-2xl theme-muted">{description}</p>
            <p className="mt-4 text-base theme-muted">
              {property.capacity} {t('property.guests')} · {property.bedrooms} bd · {property.bathrooms} ba ·{' '}
              {property.living_areas} living
            </p>
            <h2 className="mt-10 font-display text-3xl">{t('property.amenities')}</h2>
            <ul className="mt-3 grid grid-cols-2 gap-2 text-base theme-muted">
              {(property.property_amenities ?? []).map((a) => (
                <li key={a.amenities.id}>{localized(a.amenities.name_en, a.amenities.name_fr, i18n.language)}</li>
              ))}
            </ul>
            {property.kitchen_info_en ? (
              <>
                <h2 className="mt-10 font-display text-3xl">{t('property.kitchen')}</h2>
                <p className="mt-3 theme-muted">{localized(property.kitchen_info_en, property.kitchen_info_fr, i18n.language)}</p>
              </>
            ) : null}
            {property.rules_en ? (
              <>
                <h2 className="mt-10 font-display text-3xl">{t('property.rules')}</h2>
                <p className="mt-3 theme-muted">{localized(property.rules_en, property.rules_fr, i18n.language)}</p>
              </>
            ) : null}
            {maps ? (
              <>
                <h2 className="mt-10 font-display text-3xl">{t('property.location')}</h2>
                <p className="mt-2 text-base theme-muted">{property.address}</p>
                <iframe title="map" className="mt-4 h-64 w-full border border-[#d4af6a]/30 grayscale" src={maps} />
              </>
            ) : null}
          </div>
          <aside className="theme-card h-fit p-5">
            <h2 className="font-display text-2xl text-[#d4af6a]">{t('property.book')}</h2>
          <div className="mt-4">
            <AvailabilityCalendar ranges={ranges} checkIn={checkIn} checkOut={checkOut} onSelect={onSelectDate} />
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3 text-base">
            <div>
              <p className="text-sm uppercase tracking-wider text-[#d4af6a]/80">{t('property.checkIn')}</p>
              <p>{checkIn}</p>
            </div>
            <div>
              <p className="text-sm uppercase tracking-wider text-[#d4af6a]/80">{t('property.checkOut')}</p>
              <p>{checkOut}</p>
            </div>
          </div>
          <label className="mt-4 block text-sm uppercase tracking-wider text-[#d4af6a]/80">{t('property.stayNights')}</label>
          <input
            type="number"
            min={1}
            max={365}
            value={nights}
            onChange={(e) => setNights(Math.max(1, Math.min(365, Number(e.target.value) || 1)))}
            className="mt-1 w-full border border-[#d4af6a]/40 bg-transparent px-3 py-2 outline-none"
          />
          <label className="mt-4 block text-sm uppercase tracking-wider text-[#d4af6a]/80">{t('property.guests')}</label>
          <input
            type="number"
            min={1}
            max={property.capacity}
            value={guests}
            onChange={(e) => setGuests(Number(e.target.value))}
            className="mt-1 w-full border border-[#d4af6a]/40 bg-transparent px-3 py-2 outline-none"
          />
          {quote ? (
            <div className="mt-4 space-y-1 text-base">
              {quote.discount_xaf > 0 ? (
                <p>
                  <span className="text-stone line-through">{formatXaf(quote.base_amount_xaf)}</span>
                <span className="ml-2 text-[#d4af6a]">{quote.promotion_name}</span>
                </p>
              ) : null}
              <p className="text-lg">
                {formatXaf(quote.total_amount_xaf)}{' '}
                <span className="text-sm theme-muted-soft">
                  · {quote.nights} {t('property.nights')}
                </span>
              </p>
              {!quote.available ? <p className="text-red-700">{t('property.unavailable')}</p> : null}
            </div>
          ) : null}
          <Button
            className="mt-5 w-full"
            disabled={!quote?.available}
            onClick={() => {
              const q = `checkIn=${checkIn}&checkOut=${checkOut}&nights=${nights}&guests=${guests}`
              if (!user) {
                navigate(`/login?next=/properties/${property.slug}/book?${q}`)
                return
              }
              navigate(`/properties/${property.slug}/book?${q}`)
            }}
          >
            {user ? t('property.continue') : t('property.needAccount')}
          </Button>
          <p className="mt-3 text-sm theme-muted-soft">
            {t('booking.hold', { minutes: config?.hold_minutes ?? '30' })}
          </p>
        </aside>
        </div>
      </div>
    </div>
  )
}
