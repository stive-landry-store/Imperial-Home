import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import type { Promotion, Property } from '../../types/database'
import { Live } from '../i18n/Live'
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
    <article className="theme-card relative overflow-hidden rounded-2xl border border-black/10">
      <StayActions propertyId={property.id} heart />
      <Link to={`/properties/${encodeURIComponent(property.slug)}${query}`} className="block">
        <div className="aspect-[16/10] overflow-hidden bg-black/5">
          {image ? (
            <OptimizedImage src={image} alt={property.name} width={800} className="h-full w-full object-cover" />
          ) : null}
        </div>
        <div className="p-3">
          <p className="text-base font-semibold">
            <Live text={property.name} />
          </p>
          {rating ? (
            <p className="mt-0.5 text-sm text-[#d4af6a]">
              ★ {rating.average.toFixed(1)} <span className="theme-muted">({rating.count})</span>
            </p>
          ) : null}
          <p className="mt-0.5 text-sm theme-muted">
            {IMPERIAL_HOME.neighborhood}, {IMPERIAL_HOME.city}
          </p>
          <p className="mt-1 text-sm theme-muted">
            {property.capacity} {t('properties.guests')} · {t('properties.studioLine')}
          </p>
          {amenityNames.length ? (
            <p className="mt-1 text-sm theme-muted">
              <Live text={amenityNames.join(' · ')} />
            </p>
          ) : null}
          <p className="mt-2 text-sm font-semibold">
            {formatXaf(property.nightly_rate_xaf)}
            <span className="font-normal theme-muted">{t('properties.perNight')}</span>
          </p>
        </div>
      </Link>
    </article>
  )
}
