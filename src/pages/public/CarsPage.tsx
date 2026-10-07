import { useState } from 'react'
import { Helmet } from 'react-helmet-async'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { fetchPublishedVehicles, type VehicleMedia } from '../../lib/vehicles'
import { formatXaf, localized } from '../../lib/format'
import { Button } from '../../components/ui/Button'

function VehicleCover({ media, brand }: { media: VehicleMedia[]; brand: string }) {
  const sorted = [...media].sort((a, b) => a.sort_order - b.sort_order)
  const [index, setIndex] = useState(0)
  const cover = sorted[index]

  if (!cover) {
    return <div className="flex h-full items-center justify-center text-[#d4af6a]/40">{brand}</div>
  }

  if (cover.media_type === 'video') {
    return <video src={cover.url} className="h-full w-full object-cover" controls muted />
  }

  return (
    <img
      src={cover.url}
      alt=""
      className="h-full w-full object-cover transition duration-700 group-hover:scale-105"
      onError={() => {
        if (index + 1 < sorted.length) setIndex(index + 1)
      }}
    />
  )
}

export function CarsPage() {
  const { t, i18n } = useTranslation()
  const { data: vehicles = [], isLoading } = useQuery({ queryKey: ['vehicles'], queryFn: fetchPublishedVehicles })

  return (
    <div className="theme-page min-h-svh">
      <div className="mx-auto max-w-6xl px-4 pt-36 pb-24 md:px-6">
        <Helmet>
          <title>{t('cars.title')} | Impérial Home</title>
        </Helmet>
        <p className="text-[13px] tracking-[0.32em] text-[#d4af6a] uppercase">{t('cars.kicker')}</p>
        <h1 className="mt-3 font-display text-5xl tracking-[0.04em]">{t('cars.title')}</h1>
        <p className="mt-4 max-w-2xl text-base theme-muted">{t('cars.lead')}</p>
        <p className="mt-3 text-sm text-[#d4af6a]">{t('cars.promoHint')}</p>

        {isLoading ? <p className="mt-10 theme-muted">{t('common.loading')}</p> : null}

        <div className="mt-14 grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          {vehicles.map((v) => {
            const desc = localized(v.description_en, v.description_fr, i18n.language)
            return (
              <article key={v.id} className="group overflow-hidden border border-[#d4af6a]/30 bg-black/40">
                <div className="aspect-[16/10] overflow-hidden bg-black">
                  <VehicleCover media={v.vehicle_media ?? []} brand={v.brand} />
                </div>
                <div className="p-5">
                  <p className="text-xs tracking-[0.2em] text-[#d4af6a] uppercase">{v.brand}</p>
                  <h2 className="mt-1 font-display text-2xl">{v.model}</h2>
                  <p className="mt-3 text-sm theme-muted line-clamp-3">{desc}</p>
                  <dl className="mt-4 space-y-1 text-sm">
                    <div className="flex justify-between">
                      <dt>{t('cars.withoutDriver')}</dt>
                      <dd>{formatXaf(v.daily_rate_no_driver_xaf)}/j</dd>
                    </div>
                    <div className="flex justify-between text-[#d4af6a]">
                      <dt>{t('cars.withDriver')}</dt>
                      <dd>{formatXaf(v.daily_rate_with_driver_xaf)}/j</dd>
                    </div>
                  </dl>
                  <Button to="/properties" className="mt-5 w-full">
                    {t('cars.bookWithStay')}
                  </Button>
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
