import { useMemo, useState } from 'react'
import { Helmet } from 'react-helmet-async'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Button } from '../../components/ui/Button'
import { Input, Label } from '../../components/ui/Field'
import { PriceBreakdown } from '../../components/property/PriceBreakdown'
import { createBooking, fetchPropertyBySlug, fetchQuote } from '../../lib/data'
import { fetchStayServices } from '../../lib/guest'
import { formatXaf, localized } from '../../lib/format'
import { isSupabaseConfigured } from '../../lib/supabase'
import { useSiteConfig } from '../../hooks/useSite'
import { VehicleGallery } from '../../components/vehicle/VehicleGallery'
import { addVehicleRental, fetchPublishedVehicles, isVehicleAvailable } from '../../lib/vehicles'

export function BookingPage() {
  const { slug = '' } = useParams()
  const [params] = useSearchParams()
  const checkIn = params.get('checkIn') ?? ''
  const checkOut = params.get('checkOut') ?? ''
  const guests = Number(params.get('guests') ?? 1)
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { data: config } = useSiteConfig()
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const [wantCar, setWantCar] = useState(false)
  const [vehicleId, setVehicleId] = useState('')
  const [withDriver, setWithDriver] = useState(false)
  const [usePromo, setUsePromo] = useState(false)
  const [carPromo, setCarPromo] = useState('')
  const [promoDraft, setPromoDraft] = useState('')
  const [promoCode, setPromoCode] = useState('')
  const [serviceIds, setServiceIds] = useState<string[]>([])

  const { data: property } = useQuery({
    queryKey: ['property', slug],
    queryFn: () => fetchPropertyBySlug(slug),
  })
  const { data: quote, error: quoteError } = useQuery({
    queryKey: ['quote', property?.id, checkIn, checkOut, guests, promoCode, serviceIds.join(',')],
    queryFn: () => fetchQuote(property!, checkIn, checkOut, guests, promoCode, serviceIds),
    enabled: Boolean(property && checkIn && checkOut),
  })
  const { data: vehicles = [] } = useQuery({ queryKey: ['vehicles'], queryFn: fetchPublishedVehicles })
  const { data: services = [] } = useQuery({ queryKey: ['stay-services'], queryFn: fetchStayServices })

  const selectedVehicle = useMemo(() => vehicles.find((v) => v.id === vehicleId), [vehicleId, vehicles])

  const carEstimate = useMemo(() => {
    if (!wantCar || !selectedVehicle || !quote?.nights) return null
    const rate = withDriver ? selectedVehicle.daily_rate_with_driver_xaf : selectedVehicle.daily_rate_no_driver_xaf
    const base = rate * quote.nights
    const discount = usePromo && carPromo.trim() ? Math.floor(base * 0.05) : 0
    return { base, discount, total: base - discount, rate }
  }, [wantCar, selectedVehicle, quote?.nights, withDriver, usePromo, carPromo])

  async function confirm() {
    if (!property) return
    setPending(true)
    setError(null)
    try {
      if (wantCar && vehicleId) {
        const ok = await isVehicleAvailable(vehicleId, checkIn, checkOut)
        if (!ok) throw new Error(t('cars.unavailable'))
      }
      const result = await createBooking(property.id, checkIn, checkOut, guests, promoCode, serviceIds)
      if (wantCar && vehicleId) {
        await addVehicleRental(result.id, vehicleId, withDriver, usePromo ? carPromo : undefined)
      }
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['unavailable'] }),
        queryClient.invalidateQueries({ queryKey: ['admin-reservations'] }),
        queryClient.invalidateQueries({ queryKey: ['quote'] }),
      ])
      navigate(`/account/reservations/${result.id}`)
    } catch (e) {
      setError(e instanceof Error ? e.message : t('common.error'))
    } finally {
      setPending(false)
    }
  }

  if (!property) return <p className="theme-page px-6 pt-32">{t('common.loading')}</p>

  return (
    <div className="mx-auto max-w-xl px-4 pt-36 pb-20">
      <Helmet>
        <title>{t('booking.title')} | Imperial Home</title>
      </Helmet>
      <h1 className="font-display text-4xl">{t('booking.title')}</h1>
      <p className="mt-2 theme-muted">{property.name}</p>
      <dl className="theme-card mt-8 space-y-3 p-6 text-sm">
        <div className="flex justify-between">
          <dt>{t('property.checkIn')}</dt>
          <dd>{checkIn}</dd>
        </div>
        <div className="flex justify-between">
          <dt>{t('property.checkOut')}</dt>
          <dd>{checkOut}</dd>
        </div>
        <div className="flex justify-between">
          <dt>{t('property.stayNights')}</dt>
          <dd>
            {quote?.nights ?? '—'} {t('property.nights')}
          </dd>
        </div>
        <div className="flex justify-between">
          <dt>{t('property.guests')}</dt>
          <dd>{guests}</dd>
        </div>
        <div className="border-t border-line pt-3">
          {quote ? <PriceBreakdown quote={quote} /> : <p>—</p>}
          {quoteError ? <p className="mt-2 text-sm text-red-600">{t('plus.promoInvalid')}</p> : null}
        </div>
      </dl>

      <div className="theme-card mt-6 space-y-3 p-6">
        <Label>{t('plus.promoCode')}</Label>
        <div className="flex gap-2">
          <Input value={promoDraft} onChange={(e) => setPromoDraft(e.target.value)} />
          <Button type="button" variant="outline" onClick={() => setPromoCode(promoDraft.trim())}>
            {t('plus.applyCode')}
          </Button>
        </div>
        {services.length > 0 ? <p className="pt-2 text-sm uppercase tracking-wider text-[#d4af6a]">{t('plus.extras')}</p> : null}
        {services.map((service) => (
          <label key={service.id} className="flex items-center justify-between gap-3 text-sm">
            <span className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={serviceIds.includes(service.id)}
                onChange={(e) =>
                  setServiceIds((current) =>
                    e.target.checked ? [...current, service.id] : current.filter((id) => id !== service.id),
                  )
                }
              />
              {localized(service.name_en, service.name_fr, i18n.language)}
            </span>
            <span>{formatXaf(service.price_xaf)}</span>
          </label>
        ))}
      </div>

      <div className="theme-card mt-6 space-y-4 p-6">
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={wantCar} onChange={(e) => setWantCar(e.target.checked)} />
          {t('cars.addToBooking')}
        </label>
        {wantCar ? (
          <>
            <div>
              <Label>{t('cars.chooseVehicle')}</Label>
              <select
                className="mt-1 w-full border border-[#d4af6a]/40 bg-transparent px-3 py-2"
                value={vehicleId}
                onChange={(e) => setVehicleId(e.target.value)}
              >
                <option value="">{t('cars.selectPlaceholder')}</option>
                {vehicles.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.brand} {v.model}
                  </option>
                ))}
              </select>
            </div>
            {selectedVehicle ? (
              <div>
                <VehicleGallery
                  media={selectedVehicle.vehicle_media ?? []}
                  title={`${selectedVehicle.brand} ${selectedVehicle.model}`}
                />
                <p className="mt-2 text-xs theme-muted">
                  {localized(selectedVehicle.description_en, selectedVehicle.description_fr, i18n.language)}
                </p>
                <Link to={`/cars/${selectedVehicle.slug}`} className="mt-2 inline-block text-xs tracking-[0.14em] text-[#d4af6a] uppercase">
                  {t('cars.bookThis')}
                </Link>
              </div>
            ) : null}
            <div className="flex gap-4 text-sm">
              <label className="flex items-center gap-2">
                <input type="radio" checked={!withDriver} onChange={() => setWithDriver(false)} />
                {t('cars.withoutDriver')}
              </label>
              <label className="flex items-center gap-2">
                <input type="radio" checked={withDriver} onChange={() => setWithDriver(true)} />
                {t('cars.withDriver')}
              </label>
            </div>
            <div className="space-y-2">
              <label className="flex items-start gap-2 text-sm">
                <input
                  type="checkbox"
                  className="mt-0.5"
                  checked={usePromo}
                  onChange={(e) => {
                    setUsePromo(e.target.checked)
                    if (!e.target.checked) setCarPromo('')
                  }}
                />
                <span>{t('cars.promoOptional')}</span>
              </label>
              {usePromo ? (
                <div>
                  <Label>{t('cars.promoCode')}</Label>
                  <Input
                    name="car-promo-optional"
                    autoComplete="off"
                    value={carPromo}
                    onChange={(e) => setCarPromo(e.target.value)}
                    placeholder={t('cars.promoCodePlaceholder')}
                  />
                  <p className="mt-1 text-xs theme-muted">{t('cars.promoSkipHint')}</p>
                </div>
              ) : (
                <p className="text-xs theme-muted">{t('cars.promoSkipHint')}</p>
              )}
            </div>
            {carEstimate ? (
              <p className="text-sm text-[#d4af6a]">
                {t('cars.estimated')}: {formatXaf(carEstimate.total)}
                {carEstimate.discount > 0 ? ` (−${formatXaf(carEstimate.discount)})` : ''}
              </p>
            ) : null}
          </>
        ) : null}
      </div>

      <p className="mt-6 text-sm theme-muted">{t('booking.hold', { minutes: config?.hold_minutes ?? '30' })}</p>
      {!isSupabaseConfigured() ? <p className="mt-4 text-sm text-[#d4af6a]/80">{t('booking.demoBlock')}</p> : null}
      {error ? <p className="mt-4 text-sm text-red-700">{error}</p> : null}
      <Button
        className="mt-8 w-full"
        disabled={!quote?.available || pending || !isSupabaseConfigured() || (wantCar && !vehicleId)}
        onClick={() => void confirm()}
      >
        {t('booking.confirm')}
      </Button>
      <Link to={`/properties/${slug}`} className="mt-4 block text-center text-sm text-[#d4af6a]">
        {t('common.back')}
      </Link>
    </div>
  )
}
