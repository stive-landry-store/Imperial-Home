import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import type { Promotion, Property } from '../../types/database'
import { coverImage, formatXaf, localized } from '../../lib/format'
import { pickBestPromotion, quoteStay } from '../../lib/pricing'
import { Badge } from '../ui/Badge'

export function PropertyCard({
  property,
  promotions,
  lang,
  query = '',
}: {
  property: Property
  promotions: Promotion[]
  lang: string
  query?: string
}) {
  const { t } = useTranslation()
  const image = coverImage(property.property_images)
  const applicable = promotions.filter(
    (p) => p.is_active && p.promotion_properties?.some((x) => x.property_id === property.id),
  )
  const promo = pickBestPromotion(property.nightly_rate_xaf, applicable)
  const quoted = quoteStay(property.nightly_rate_xaf, 1, promo)
  const amenityNames = (property.property_amenities ?? [])
    .map((a) => localized(a.amenities.name_en, a.amenities.name_fr, lang))
    .slice(0, 3)

  return (
    <Link to={`/properties/${encodeURIComponent(property.slug)}${query}`} className="group block">
      <div className="relative aspect-[3/4] overflow-hidden bg-black">
        {image ? (
          <img
            src={image}
            alt={property.name}
            loading="lazy"
            className="h-full w-full object-cover transition duration-[1.2s] ease-out group-hover:scale-105"
          />
        ) : null}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />
        {promo ? (
          <div className="absolute top-4 left-4">
            <Badge variant="dark">{promo.name}</Badge>
          </div>
        ) : null}
        <div className="absolute inset-x-0 bottom-0 p-5 text-[#f4eee3]">
          <p className="text-[12px] tracking-[0.22em] text-[#d4af6a] uppercase">
            {t('properties.houseLabel')}
          </p>
          <p className="mt-1 font-display text-2xl tracking-[0.06em]">{property.name}</p>
          <p className="mt-2 text-sm text-white/70">
            {property.capacity} {t('properties.guests')} · {property.bedrooms} bd · {property.bathrooms} ba
          </p>
          {amenityNames.length ? <p className="mt-1 text-sm text-white/55">{amenityNames.join(' · ')}</p> : null}
          <p className="mt-3 text-base">
            {quoted.discount_xaf > 0 ? (
              <>
                <span className="mr-2 text-white/40 line-through">{formatXaf(quoted.base_amount_xaf)}</span>
                <span className="text-[#d4af6a]">{formatXaf(quoted.total_amount_xaf)}</span>
              </>
            ) : (
              <span className="text-[#d4af6a]">{formatXaf(property.nightly_rate_xaf)}</span>
            )}
            <span className="text-white/50">{t('properties.perNight')}</span>
          </p>
        </div>
      </div>
    </Link>
  )
}
