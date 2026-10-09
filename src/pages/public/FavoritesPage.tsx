import { useEffect, useState } from 'react'
import { Helmet } from 'react-helmet-async'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Heart } from 'lucide-react'
import { PropertyCard } from '../../components/property/PropertyCard'
import { usePublishedProperties, usePromotions } from '../../hooks/useSite'
import { favoriteCarIds, favoriteIds, toggleCarFavorite } from '../../lib/savedStays'
import { formatXaf } from '../../lib/format'
import { fetchPublishedVehicles, vehicleCover } from '../../lib/vehicles'

export function FavoritesPage() {
  const { t, i18n } = useTranslation()
  const { data: properties = [], isLoading: staysLoading } = usePublishedProperties()
  const { data: promotions = [] } = usePromotions()
  const { data: vehicles = [], isLoading: carsLoading } = useQuery({ queryKey: ['vehicles'], queryFn: fetchPublishedVehicles })
  const [stayIds, setStayIds] = useState<string[]>([])
  const [carIds, setCarIds] = useState<string[]>([])

  useEffect(() => {
    const sync = () => {
      setStayIds(favoriteIds())
      setCarIds(favoriteCarIds())
    }
    sync()
    window.addEventListener('ih-saved-stays', sync)
    return () => window.removeEventListener('ih-saved-stays', sync)
  }, [])

  const stays = properties.filter((item) => stayIds.includes(item.id))
  const cars = vehicles.filter((item) => carIds.includes(item.id))
  const empty = !staysLoading && !carsLoading && stays.length === 0 && cars.length === 0

  return (
    <div className="theme-page mx-auto max-w-6xl px-4 pt-24 pb-8 md:px-6">
      <Helmet>
        <title>{t('nav.favorites')} | Impérial Home</title>
      </Helmet>
      <h1 className="text-2xl font-semibold">{t('nav.favorites')}</h1>
      {empty ? <p className="mt-6 text-sm theme-muted">{t('account.favoritesEmpty')}</p> : null}

      {stays.length ? (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {stays.map((property) => (
            <PropertyCard key={property.id} property={property} promotions={promotions} lang={i18n.language} />
          ))}
        </div>
      ) : null}

      {cars.length ? (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {cars.map((car) => {
            const cover = vehicleCover(car)
            return (
              <article key={car.id} className="theme-card overflow-hidden rounded-2xl border border-black/10">
                <div className="relative">
                  <Link to={`/cars/${car.slug}`} className="block">
                    {cover ? <img src={cover} alt="" className="aspect-[16/10] w-full object-cover" /> : <div className="aspect-[16/10] bg-black/5" />}
                    <div className="p-3">
                      <p className="text-base font-semibold">
                        {car.brand} {car.model}
                      </p>
                      <p className="mt-1 text-sm">{formatXaf(car.daily_rate_no_driver_xaf)} / j</p>
                    </div>
                  </Link>
                  <button
                    type="button"
                    className="absolute top-3 right-3 flex h-10 w-10 items-center justify-center rounded-full bg-white text-red-500 shadow"
                    aria-label={t('nav.favorites')}
                    onClick={() => toggleCarFavorite(car.id)}
                  >
                    <Heart className="h-5 w-5 fill-current" />
                  </button>
                </div>
              </article>
            )
          })}
        </div>
      ) : null}
    </div>
  )
}
