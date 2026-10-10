import { useEffect, useState } from 'react'
import { Helmet } from 'react-helmet-async'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { Heart } from 'lucide-react'
import { VehicleGallery } from '../../components/vehicle/VehicleGallery'
import { favoriteCarIds, toggleCarFavorite } from '../../lib/savedStays'
import { fetchPublishedVehicles } from '../../lib/vehicles'
import { formatXaf, localized } from '../../lib/format'
import { Button } from '../../components/ui/Button'
import { Live } from '../../components/i18n/Live'
import { Loader } from '../../components/ui/Loader'

export function CarsPage() {
  const { t, i18n } = useTranslation()
  const { data: vehicles = [], isLoading } = useQuery({ queryKey: ['vehicles'], queryFn: fetchPublishedVehicles })
  const [savedCars, setSavedCars] = useState<string[]>([])
  useEffect(() => {
    const sync = () => setSavedCars(favoriteCarIds())
    sync()
    window.addEventListener('ih-saved-stays', sync)
    return () => window.removeEventListener('ih-saved-stays', sync)
  }, [])

  return (
    <div className="theme-page min-h-svh">
      <div className="mx-auto max-w-6xl px-4 pt-36 pb-24 md:px-6">
        <Helmet>
          <title>{t('cars.title')} | Impérial Home</title>
        </Helmet>
        <h1 className="text-2xl font-semibold">{t('cars.title')}</h1>
        <p className="mt-2 max-w-2xl text-sm theme-muted">{t('cars.lead')}</p>
        <p className="mt-3 text-sm text-[#d4af6a]">{t('cars.promoHint')}</p>

        {isLoading ? <Loader size="md" /> : null}

        <div className="mt-14 grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          {vehicles.map((v) => {
            const desc = localized(v.description_en, v.description_fr, i18n.language)
            return (
              <article key={v.id} className="theme-card relative overflow-hidden rounded-2xl border border-black/10">
                <button
                  type="button"
                  className="absolute top-3 right-3 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white text-neutral-700 shadow"
                  aria-label={t('nav.favorites')}
                  onClick={() => toggleCarFavorite(v.id)}
                >
                  <Heart className={savedCars.includes(v.id) ? 'h-5 w-5 fill-red-500 text-red-500' : 'h-5 w-5'} />
                </button>
                <VehicleGallery media={v.vehicle_media ?? []} title={`${v.brand} ${v.model}`} />
                <div className="p-5">
                  <p className="text-sm theme-muted">{v.brand}</p>
                  <h2 className="text-lg font-semibold">{v.model}</h2>
                  <p className="mt-3 text-sm theme-muted line-clamp-3">
                    <Live text={desc} />
                  </p>
                  <dl className="mt-4 space-y-1 text-sm">
                    <div className="flex flex-wrap justify-between gap-x-3 gap-y-1">
                      <dt>{t('cars.withoutDriver')}</dt>
                      <dd>{formatXaf(v.daily_rate_no_driver_xaf)}/j</dd>
                    </div>
                    <div className="flex flex-wrap justify-between gap-x-3 gap-y-1 text-[#d4af6a]">
                      <dt>{t('cars.withDriver')}</dt>
                      <dd>{formatXaf(v.daily_rate_with_driver_xaf)}/j</dd>
                    </div>
                  </dl>
                  <Button to={`/cars/${v.slug}`} className="mt-5 w-full">
                    {t('cars.bookThis')}
                  </Button>
                  <Link to="/properties" className="mt-3 block text-center text-sm text-[#c4a35a]">
                    {t('cars.bookWithStay')}
                  </Link>
                </div>
              </article>
            )
          })}
        </div>

        {!isLoading && vehicles.length === 0 ? (
          <p className="mt-10 theme-muted">
            {t('cars.empty')}{' '}
            <Link to="/contact" className="text-[#d4af6a]">
              {t('nav.contact')}
            </Link>
          </p>
        ) : null}
      </div>
    </div>
  )
}
