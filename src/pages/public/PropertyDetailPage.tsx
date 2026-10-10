import { useEffect, useMemo, useState } from 'react'
import { Helmet } from 'react-helmet-async'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useMatricule } from '../../hooks/useMatricule'
import { useTranslation } from 'react-i18next'
import { PropertyGallery } from '../../components/property/PropertyGallery'
import { AvailabilityCalendar } from '../../components/booking/AvailabilityCalendar'
import { ManualDate } from '../../components/booking/ManualDate'
import { PriceBreakdown } from '../../components/property/PriceBreakdown'
import { ReviewList } from '../../components/property/ReviewList'
import { SimilarStays } from '../../components/property/SimilarStays'
import { StayActions } from '../../components/property/StayActions'
import { WaitlistForm } from '../../components/booking/WaitlistForm'
import { Button } from '../../components/ui/Button'
import { Live, useLiveTranslation } from '../../components/i18n/Live'
import { Loader } from '../../components/ui/Loader'
import { fetchPropertyBySlug, fetchQuote, fetchUnavailableRanges } from '../../lib/data'
import { checkOutFromNights, isDateAvailable, nightsBetween, stayAfterReserved, todayIso } from '../../lib/availability'
import { PlaceActions } from '../../components/property/PlaceActions'
import { PlaceMap } from '../../components/property/PlaceMap'
import { imperialPlace } from '../../lib/place'
import { shareSite } from '../../lib/social'
import { coverImage, formatDate, localized } from '../../lib/format'
import { whatsappUrl } from '../../lib/whatsapp'
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
  const guests = 1
  const [copied, setCopied] = useState(false)

  const { data: ranges = [] } = useQuery({
    queryKey: ['unavailable', property?.id],
    queryFn: () => fetchUnavailableRanges(property!.id),
    enabled: Boolean(property?.id),
  })

  const adjusted = useMemo(
    () => stayAfterReserved(checkIn, checkOutFromNights(checkIn, nights), ranges),
    [checkIn, nights, ranges],
  )
  const activeCheckIn = adjusted.checkIn
  const checkOut = adjusted.checkOut
  const shownNights = Math.max(1, nightsBetween(activeCheckIn, checkOut))
  const followsReserved = ranges.some((range) => range.end_date === activeCheckIn)

  useEffect(() => {
    if (adjusted.checkIn !== checkIn) setCheckIn(adjusted.checkIn)
    if (shownNights !== nights) setNights(shownNights)
  }, [adjusted.checkIn, checkIn, shownNights, nights])

  const { data: quote } = useQuery({
    queryKey: ['quote', property?.id, activeCheckIn, checkOut, guests],
    queryFn: () => fetchQuote(property!, activeCheckIn, checkOut, guests),
    enabled: Boolean(property && activeCheckIn && checkOut),
  })

  const description = useLiveTranslation(
    property ? localized(property.description_en, property.description_fr, i18n.language) : '',
  )

  function onSelectDate(iso: string) {
    if (iso < todayIso() || !isDateAvailable(iso, ranges)) return
    if (!activeCheckIn || iso <= activeCheckIn) {
      setCheckIn(iso)
      return
    }
    setCheckIn(activeCheckIn)
    setNights(Math.max(1, nightsBetween(activeCheckIn, iso)))
  }

  function onManualCheckIn(iso: string) {
    if (iso < todayIso()) return
    const nextNights = checkOut > iso ? Math.max(1, nightsBetween(iso, checkOut)) : nights
    setCheckIn(iso)
    setNights(nextNights)
  }

  function onManualCheckOut(iso: string) {
    if (iso <= activeCheckIn) return
    setCheckIn(activeCheckIn)
    setNights(Math.max(1, nightsBetween(activeCheckIn, iso)))
  }

  const matricule = useMatricule(property)

  if (isLoading) {
    return (
      <div className="theme-page pt-24">
        <Loader size="lg" fill />
      </div>
    )
  }
  if (!property) {
    return <p className="theme-page px-6 pt-32">{t('properties.notFound')}</p>
  }

  const place = imperialPlace(config)

  return (
    <div className="theme-page">
      <div className="mx-auto max-w-6xl px-4 pt-32 pb-20 md:px-6">
        <Helmet>
          <title>{property.name} | Impérial Home Douala</title>
          <meta name="description" content={description.slice(0, 160)} />
          <meta property="og:title" content={`${property.name} | Impérial Home`} />
          <meta property="og:description" content={description.slice(0, 160)} />
          {coverImage(property.property_images) ? <meta property="og:image" content={coverImage(property.property_images)} /> : null}
          <script type="application/ld+json">
            {JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'Apartment',
              name: property.name,
              description: description.slice(0, 300),
              address: {
                '@type': 'PostalAddress',
                streetAddress: property.address,
                addressLocality: property.city || 'Douala',
                addressCountry: 'CM',
              },
            })}
          </script>
        </Helmet>
        <PropertyGallery images={property.property_images ?? []} lang={i18n.language} />
        <div className="mt-8 max-w-3xl">
          <div>
            <p className="text-[13px] tracking-[0.28em] text-[#d4af6a] uppercase">{t('properties.houseLabel')}</p>
            <h1 className="mt-2 font-display text-5xl tracking-[0.04em]">
              <Live text={property.name} />
            </h1>
            {matricule ? <p className="mt-2 text-xs tracking-[0.24em] text-[#d4af6a]">{matricule}</p> : null}
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <StayActions propertyId={property.id} />
              <button
                type="button"
                className="text-[11px] tracking-[0.14em] text-[#d4af6a] uppercase"
                onClick={() =>
                  window.open(
                    whatsappUrl(
                      config?.whatsapp ?? '237674092263',
                      `${property.name} — ${window.location.origin}/properties/${property.slug}`,
                    ),
                    '_blank',
                  )
                }
              >
                {t('plus.share')}
              </button>
              <button
                type="button"
                className="text-[11px] tracking-[0.14em] text-[#d4af6a] uppercase"
                onClick={() =>
                  void shareSite(window.location.href).then((result) => {
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
            <p className="mt-4 max-w-2xl theme-muted">{description}</p>
            <p className="mt-4 text-base theme-muted">
              {property.capacity} {t('properties.guests')} · {property.bedrooms}{' '}
              {t(property.bedrooms > 1 ? 'properties.beds' : 'properties.bed')} · {property.bathrooms}{' '}
              {t(property.bathrooms > 1 ? 'properties.baths' : 'properties.bath')} · {property.living_areas}{' '}
              {t(property.living_areas > 1 ? 'properties.livings' : 'properties.living')}
            </p>
            <section className="theme-card mt-8 p-5">
              <h2 className="text-xl font-semibold">{t('property.book')}</h2>
              <div className="mt-4">
                <AvailabilityCalendar ranges={ranges} checkIn={activeCheckIn} checkOut={checkOut} onSelect={onSelectDate} />
              </div>
              {adjusted.shifted || followsReserved ? (
                <p className="mt-3 text-sm text-[#d4af6a]">
                  {t('property.skipReserved', {
                    date: formatDate(activeCheckIn, i18n.language.startsWith('fr') ? 'fr-FR' : 'en-GB'),
                  })}
                </p>
              ) : null}
              <div className="mt-4 grid min-w-0 gap-3 sm:grid-cols-2">
                <ManualDate label={t('property.checkIn')} value={activeCheckIn} min={todayIso()} onChange={onManualCheckIn} />
                <ManualDate label={t('property.checkOut')} value={checkOut} min={checkOutFromNights(activeCheckIn, 1)} onChange={onManualCheckOut} />
                <fieldset className="min-w-0 max-w-full sm:col-span-2">
                  <legend className="text-sm tracking-wider text-[#d4af6a]/80 uppercase">{t('property.stayNights')}</legend>
                  <input
                    type="number"
                    min={1}
                    max={365}
                    inputMode="numeric"
                    value={shownNights}
                    onChange={(e) => setNights(Math.max(1, Math.min(365, Number(e.target.value) || 1)))}
                    className="mt-1 box-border min-h-12 w-full max-w-full border border-[#d4af6a]/40 bg-transparent px-3 text-base outline-none"
                  />
                </fieldset>
              </div>
              {quote ? (
                <div className="mt-4">
                  <PriceBreakdown quote={quote} />
                  {!quote.available ? <p className="mt-2 text-red-700">{t('property.unavailable')}</p> : null}
                  {!quote.available ? (
                    <WaitlistForm propertyId={property.id} checkIn={activeCheckIn} checkOut={checkOut} guests={guests} />
                  ) : null}
                </div>
              ) : null}
              <Button
                className="mt-5 w-full"
                disabled={!quote?.available}
                onClick={() => {
                  const q = `checkIn=${activeCheckIn}&checkOut=${checkOut}&nights=${shownNights}&guests=${guests}`
                  if (!user) {
                    navigate(`/login?next=/properties/${property.slug}/book?${q}`)
                    return
                  }
                  navigate(`/properties/${property.slug}/book?${q}`)
                }}
              >
                {user ? t('property.continue') : t('property.needAccount')}
              </Button>
              <p className="mt-3 text-sm theme-muted-soft">{t('booking.hold', { minutes: config?.hold_minutes ?? '30' })}</p>
            </section>
            <section className="mt-8">
              <h2 className="text-xl font-semibold">{t('property.location')}</h2>
              <p className="mt-2 text-base">{place.address}</p>
              <div className="mt-3">
                <PlaceMap latitude={place.latitude} longitude={place.longitude} label={`${place.label} · ${place.address}`} className="h-72" />
                <PlaceActions place={place} />
              </div>
            </section>
            <h2 className="mt-10 text-xl font-semibold">{t('property.amenities')}</h2>
            <ul className="mt-3 grid grid-cols-2 gap-2 text-base theme-muted">
              {(property.property_amenities ?? []).map((a) => (
                <li key={a.amenities.id}>
                  <Live text={localized(a.amenities.name_en, a.amenities.name_fr, i18n.language)} />
                </li>
              ))}
            </ul>
            {property.kitchen_info_en ? (
              <>
                <h2 className="mt-10 font-display text-3xl">{t('property.kitchen')}</h2>
                <p className="mt-3 theme-muted">
                  <Live text={localized(property.kitchen_info_en, property.kitchen_info_fr, i18n.language)} />
                </p>
              </>
            ) : null}
            {property.rules_en ? (
              <>
                <h2 className="mt-10 font-display text-3xl">{t('property.rules')}</h2>
                <p className="mt-3 theme-muted">
                  <Live text={localized(property.rules_en, property.rules_fr, i18n.language)} />
                </p>
              </>
            ) : null}
            <ReviewList propertyId={property.id} />
          </div>
        </div>
        <SimilarStays currentId={property.id} />
      </div>
    </div>
  )
}
