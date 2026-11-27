import { Link } from 'react-router-dom'
import { ArrowUpRight } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { Promotion, Property } from '../../types/database'
import { Live } from '../i18n/Live'
import { apartmentSummary } from '../../lib/apartmentCopy'
import { IMPERIAL_HOME } from '../../lib/house'
import { coverImage, formatXaf, localized } from '../../lib/format'
import { OptimizedImage } from '../ui/OptimizedImage'
import { StayActions } from './StayActions'
import { useQuery } from '@tanstack/react-query'
import { fetchRatings } from '../../lib/guest'

export function PropertyCard({
  property,
  lang,
  query = '',
}: {
  property: Property
  promotions?: Promotion[]
  lang: string
  query?: string
}) {
  const { t } = useTranslation()
  const { data: ratings } = useQuery({ queryKey: ['reviews', 'ratings'], queryFn: fetchRatings, staleTime: 120_000 })
  const rating = ratings?.[property.id]
  const image = coverImage(property.property_images)
  const amenityNames = (property.property_amenities ?? [])
    .map((a) => localized(a.amenities.name_en, a.amenities.name_fr, lang))
    .slice(0, 3)

  return (
    <article className="ih-card theme-card relative flex h-full w-full flex-col overflow-hidden">
      <StayActions propertyId={property.id} heart />
      <Link to={`/properties/${encodeURIComponent(property.slug)}${query}`} className="flex h-full flex-col">
        <div className="ih-card-media aspect-[4/3] shrink-0 overflow-hidden bg-accent-soft">
          {image ? (
            <OptimizedImage src={image} alt={property.name} width={800} sizes="(max-width: 768px) 80vw, 33vw" className="h-full w-full object-cover" />
          ) : null}
        </div>
        <div className="flex flex-1 flex-col px-4 pt-3.5 pb-4">
          <p className="line-clamp-1 font-display text-xl font-medium">
            <Live text={property.name} />
          </p>
          <p className="mt-0.5 min-h-5 text-sm leading-5 text-accent">
            {rating ? (
              <>
                ★ {rating.average.toFixed(1)} <span className="theme-muted">({rating.count})</span>
              </>
            ) : null}
          </p>
          <p className="line-clamp-1 text-sm theme-muted">
            {IMPERIAL_HOME.neighborhood}, {IMPERIAL_HOME.city}
          </p>
          <p className="mt-1 line-clamp-2 min-h-10 text-sm leading-5 theme-muted">{apartmentSummary(property, lang)}</p>
          <p className="mt-1 line-clamp-1 min-h-5 text-sm leading-5 theme-muted">
            {amenityNames.length ? <Live text={amenityNames.join(' · ')} /> : null}
          </p>
          <div className="mt-auto flex items-center justify-between gap-2 border-t border-line pt-3">
            <p className="text-[15px] font-semibold">
              {formatXaf(property.nightly_rate_xaf)}
              <span className="text-sm font-normal theme-muted">{t('properties.perNight')}</span>
            </p>
            <span className="ih-card-go grid h-9 w-9 shrink-0 place-items-center rounded-full bg-accent-soft text-accent" aria-hidden>
              <ArrowUpRight className="h-4 w-4" />
            </span>
          </div>
        </div>
      </Link>
    </article>
  )
}
