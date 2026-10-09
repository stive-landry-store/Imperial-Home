import { useMemo, useState } from 'react'
import { Helmet } from 'react-helmet-async'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { ManualDate } from '../../components/booking/ManualDate'
import { VehicleGallery } from '../../components/vehicle/VehicleGallery'
import { Button } from '../../components/ui/Button'
import { Input, Label } from '../../components/ui/Field'
import { useAuth } from '../../hooks/useAuth'
import { addDaysIso, nightsBetween, todayIso } from '../../lib/availability'
import { formatDate, formatXaf, localized } from '../../lib/format'
import {
  bookVehicle,
  fetchVehicleBySlug,
  fetchVehiclePromos,
  isVehicleAvailable,
} from '../../lib/vehicles'

export function CarDetailPage() {
  const { slug = '' } = useParams()
  const { t, i18n } = useTranslation()
  const { user } = useAuth()
  const navigate = useNavigate()
  const { data: vehicle, isLoading } = useQuery({
    queryKey: ['vehicle', slug],
    queryFn: () => fetchVehicleBySlug(slug),
    enabled: Boolean(slug),
  })
  const { data: promos = [] } = useQuery({ queryKey: ['vehicle-promos'], queryFn: fetchVehiclePromos })

  const [start, setStart] = useState(todayIso())
  const [days, setDays] = useState(1)
  const [withDriver, setWithDriver] = useState(false)
  const [promoCode, setPromoCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [booked, setBooked] = useState<{ code: string; total: number } | null>(null)

  const end = addDaysIso(start, Math.max(1, days))
  const loginNext = `/login?next=${encodeURIComponent(`/cars/${slug}`)}`

  const { data: available, isPending: checking } = useQuery({
    queryKey: ['vehicle-available', vehicle?.id, start, end],
    queryFn: () => isVehicleAvailable(vehicle!.id, start, end),
    enabled: Boolean(vehicle?.id),
  })

  const quote = useMemo(() => {
    if (!vehicle) return null
    const rate = withDriver ? vehicle.daily_rate_with_driver_xaf : vehicle.daily_rate_no_driver_xaf
    const base = rate * Math.max(1, days)
    const match = promos.find((promo) => promo.code.toUpperCase() === promoCode.trim().toUpperCase())
    const discount = match ? Math.floor((base * Number(match.discount_percent)) / 100) : 0
    return { rate, base, discount, total: base - discount, matched: Boolean(match) }
  }, [vehicle, withDriver, days, promos, promoCode])

  const book = useMutation({
    mutationFn: async () => {
      if (!vehicle) throw new Error('missing')
      return bookVehicle({
        vehicleId: vehicle.id,
        start,
        end,
        withDriver,
        promoCode,
      })
    },
    onSuccess: (result) => {
      setError(null)
      setBooked({ code: result.public_code, total: result.total_xaf })
    },
    onError: (err: { message?: string; code?: string }) => {
      const message = err.message ?? ''
      if (message.includes('not available') || message.includes('not available for')) {
        setError(t('cars.unavailable'))
        return
      }
      if (message.includes('Not authenticated') || err.code === '28000') {
        navigate(loginNext)
        return
      }
      if (err.code === 'PGRST202' || message.includes('Could not find the function')) {
        setError(t('cars.bookingSoon'))
        return
      }
      setError(message || t('cars.unavailable'))
    },
  })

  if (isLoading) {
    return <p className="theme-page px-6 pt-36 theme-muted">{t('common.loading')}</p>
  }

  if (!vehicle || vehicle.status === 'archived') {
    return (
      <div className="theme-page min-h-svh px-6 pt-36">
        <p className="theme-muted">{t('cars.empty')}</p>
        <Link to="/cars" className="mt-4 inline-block text-[#d4af6a]">
          {t('cars.back')}
        </Link>
      </div>
    )
  }

  const title = `${vehicle.brand} ${vehicle.model}`
  const desc = localized(vehicle.description_en, vehicle.description_fr, i18n.language)

  return (
    <div className="theme-page min-h-svh">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 pt-32 pb-28 md:grid-cols-[minmax(0,1.3fr)_minmax(0,0.9fr)] md:px-6">
        <Helmet>
          <title>{title} | Impérial Home</title>
        </Helmet>
        <div className="min-w-0 max-w-full">
          <Link to="/cars" className="text-xs tracking-[0.2em] text-[#d4af6a] uppercase">
            {t('cars.back')}
          </Link>
          <p className="mt-4 text-xs tracking-[0.2em] text-[#d4af6a] uppercase">{vehicle.brand}</p>
          <h1 className="mt-1 font-display text-5xl">{vehicle.model}</h1>
          <p className="mt-4 max-w-xl theme-muted">{desc}</p>
          <div className="mt-6 overflow-hidden border border-[#d4af6a]/30">
            <VehicleGallery media={vehicle.vehicle_media ?? []} title={title} />
          </div>
        </div>

        <aside className="h-fit min-w-0 max-w-full border border-[#d4af6a]/40 bg-black/40 p-4 sm:p-5">
          <p className="text-xs tracking-[0.22em] text-[#d4af6a] uppercase">{t('cars.bookAlone')}</p>
          <h2 className="mt-2 font-display text-3xl">{t('cars.bookThis')}</h2>
          <p className="mt-2 text-sm theme-muted">{t('cars.aloneHint')}</p>

          {booked ? (
            <div className="mt-6 space-y-3">
              <p className="text-[#d4af6a]">{t('cars.requestSent')}</p>
              <p className="font-display text-3xl">{booked.code}</p>
              <p className="text-sm theme-muted">{t('cars.requestLead')}</p>
              <p className="text-sm">{formatXaf(booked.total)}</p>
              <Button to="/account" className="w-full">
                {t('cars.seeAccount')}
              </Button>
            </div>
          ) : (
            <form
              className="mt-6 space-y-4"
              onSubmit={(event) => {
                event.preventDefault()
                if (!user) {
                  navigate(loginNext)
                  return
                }
                if (available === false) {
                  setError(t('cars.unavailable'))
                  return
                }
                setError(null)
                book.mutate()
              }}
            >
              <ManualDate label={t('cars.start')} value={start} min={todayIso()} onChange={setStart} />
              <ManualDate
                label={t('cars.until')}
                value={end}
                min={addDaysIso(start, 1)}
                onChange={(iso) => {
                  const next = nightsBetween(start, iso)
                  if (next >= 1) setDays(Math.min(90, next))
                }}
              />
              <div>
                <Label>{t('cars.days')}</Label>
                <Input
                  type="number"
                  min={1}
                  max={90}
                  value={days}
                  onChange={(event) => setDays(Math.max(1, Number(event.target.value) || 1))}
                  required
                />
              </div>
              <p className="text-sm theme-muted">
                {t('cars.until')} {formatDate(end, i18n.language.startsWith('fr') ? 'fr-FR' : 'en-GB')}
              </p>
              <div className="grid gap-2">
                <button
                  type="button"
                  className={`min-h-12 w-full border px-3 py-3 text-base ${!withDriver ? 'border-[#d4af6a] bg-[#d4af6a]/15 text-[#d4af6a]' : 'border-white/20'}`}
                  onClick={() => setWithDriver(false)}
                >
                  {t('cars.withoutDriver')}
                </button>
                <button
                  type="button"
                  className={`min-h-12 w-full border px-3 py-3 text-base ${withDriver ? 'border-[#d4af6a] bg-[#d4af6a]/15 text-[#d4af6a]' : 'border-white/20'}`}
                  onClick={() => setWithDriver(true)}
                >
                  {t('cars.withDriver')}
                </button>
              </div>
              <div>
                <Label>{t('cars.promoCode')}</Label>
                <Input
                  value={promoCode}
                  placeholder={t('cars.promoCodePlaceholder')}
                  onChange={(event) => setPromoCode(event.target.value)}
                />
                <p className="mt-1 text-xs theme-muted">{t('cars.promoSkipHint')}</p>
              </div>
              {quote ? (
                <dl className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <dt>
                      {formatXaf(quote.rate)} × {Math.max(1, days)}
                    </dt>
                    <dd>{formatXaf(quote.base)}</dd>
                  </div>
                  {quote.discount > 0 ? (
                    <div className="flex justify-between text-[#d4af6a]">
                      <dt>{t('cars.promoCode')}</dt>
                      <dd>−{formatXaf(quote.discount)}</dd>
                    </div>
                  ) : null}
                  <div className="flex justify-between font-medium">
                    <dt>{t('cars.total')}</dt>
                    <dd>{formatXaf(quote.total)}</dd>
                  </div>
                </dl>
              ) : null}
              {checking ? <p className="text-xs theme-muted">{t('common.loading')}</p> : null}
              {available === false ? <p className="text-sm text-red-300">{t('cars.unavailable')}</p> : null}
              {error ? <p className="text-sm text-red-300">{error}</p> : null}
              {user ? (
                <Button type="submit" className="w-full" disabled={book.isPending || available === false}>
                  {book.isPending ? t('common.loading') : t('cars.bookThis')}
                </Button>
              ) : (
                <Button to={loginNext} className="w-full">
                  {t('cars.loginToBook')}
                </Button>
              )}
              <Link to="/properties" className="block text-center text-xs tracking-[0.14em] text-[#d4af6a] uppercase">
                {t('cars.bookWithStay')}
              </Link>
            </form>
          )}
        </aside>
      </div>
    </div>
  )
}
