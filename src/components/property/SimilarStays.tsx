import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Car, ChevronRight } from 'lucide-react'
import { fetchPublishedProperties } from '../../lib/data'
import { coverImage, formatXaf } from '../../lib/format'
import { Live } from '../i18n/Live'
import { OptimizedImage } from '../ui/OptimizedImage'

export function SimilarStays({ currentId }: { currentId: string }) {
  const { t } = useTranslation()
  const { data = [] } = useQuery({ queryKey: ['properties', 'published'], queryFn: fetchPublishedProperties })
  const others = data.filter((p) => p.id !== currentId).slice(0, 6)

  return (
    <section className="mt-12">
      {others.length ? (
        <>
          <h2 className="font-display text-2xl">{t('app.similar')}</h2>
          <div className="-mx-4 mt-4 flex snap-x gap-3 overflow-x-auto px-4 pb-2" data-no-swipe>
            {others.map((p) => {
              const image = coverImage(p.property_images)
              return (
                <Link
                  key={p.id}
                  to={`/properties/${encodeURIComponent(p.slug)}`}
                  className="theme-card w-64 shrink-0 snap-start overflow-hidden rounded-2xl border border-black/10"
                >
                  <div className="aspect-[16/10] bg-black/5">
                    {image ? <OptimizedImage src={image} alt={p.name} width={500} className="h-full w-full object-cover" /> : null}
                  </div>
                  <div className="p-3">
                    <p className="font-semibold">
                      <Live text={p.name} />
                    </p>
                    <p className="mt-1 text-sm font-semibold">
                      {formatXaf(p.nightly_rate_xaf)}
                      <span className="font-normal theme-muted">{t('properties.perNight')}</span>
                    </p>
                  </div>
                </Link>
              )
            })}
          </div>
        </>
      ) : null}
      <Link
        to="/cars"
        className="mt-6 flex items-center gap-4 rounded-2xl border border-[#d4af6a]/60 bg-[#0a0907] p-4 text-[#f4eee3]"
      >
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full border border-[#d4af6a] text-[#ecd08a]">
          <Car className="h-6 w-6" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-display text-lg text-[#ecd08a]">{t('app.carUpsellTitle')}</span>
          <span className="block text-sm text-[#a89f90]">{t('app.carUpsellLead')}</span>
        </span>
        <ChevronRight className="h-5 w-5 text-[#d4af6a] rtl:scale-x-[-1]" />
      </Link>
    </section>
  )
}
