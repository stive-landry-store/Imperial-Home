import { Helmet } from 'react-helmet-async'
import { Link, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { PropertyCard } from '../../components/property/PropertyCard'
import { Loader } from '../../components/ui/Loader'
import { usePublishedProperties, usePromotions } from '../../hooks/useSite'
import type { Property } from '../../types/database'

function hasAmenity(property: Property, needle: string) {
  return (property.property_amenities ?? []).some((item) => {
    const blob = `${item.amenities.slug} ${item.amenities.name_en} ${item.amenities.name_fr}`.toLowerCase()
    return blob.includes(needle)
  })
}

export function PropertiesPage() {
  const { t, i18n } = useTranslation()
  const [params, setParams] = useSearchParams()
  const { data: properties = [], isLoading } = usePublishedProperties()
  const { data: promotions = [] } = usePromotions()
  const query = params.toString() ? `?${params.toString()}` : ''
  const neighborhood = params.get('neighborhood') ?? ''
  const maxPrice = Number(params.get('max') ?? 0)
  const bedrooms = Number(params.get('beds') ?? 0)
  const guests = Number(params.get('guests') ?? 0)
  const wifi = params.get('wifi') === '1'
  const parking = params.get('parking') === '1'
  const ac = params.get('ac') === '1'

  const neighborhoods = [...new Set(properties.map((property) => property.neighborhood).filter(Boolean))] as string[]

  const visible = properties.filter((property) => {
    if (neighborhood && property.neighborhood !== neighborhood) return false
    if (maxPrice > 0 && property.nightly_rate_xaf > maxPrice) return false
    if (bedrooms > 0 && property.bedrooms < bedrooms) return false
    if (guests > 0 && property.capacity < guests) return false
    if (wifi && !hasAmenity(property, 'wi')) return false
    if (parking && !hasAmenity(property, 'park')) return false
    if (ac && !hasAmenity(property, 'clim') && !hasAmenity(property, 'air')) return false
    return true
  })

  function setFilter(key: string, value: string) {
    const next = new URLSearchParams(params)
    if (value) next.set(key, value)
    else next.delete(key)
    setParams(next, { replace: true })
  }

  return (
    <div className="theme-page min-h-svh">
      <div className="mx-auto max-w-6xl px-4 pt-36 pb-24 md:px-6">
        <Helmet>
          <title>{t('properties.title')} | Impérial Home</title>
          <meta name="description" content={t('properties.lead')} />
        </Helmet>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold">{t('properties.title')}</h1>
            <p className="mt-2 max-w-xl text-sm theme-muted">{t('properties.lead')}</p>
          </div>
          <Link to="/properties/map" className="text-sm font-medium text-[#c4a35a]">
            {t('plus.openMap')}
          </Link>
        </div>
        {params.get('checkIn') && params.get('checkOut') ? (
          <p className="mt-6 text-base tracking-wide text-[#d4af6a]">
            {params.get('checkIn')} → {params.get('checkOut')}
            {params.get('nights') ? ` · ${params.get('nights')} ${t('property.nights')}` : ''}
            {params.get('guests') ? ` · ${params.get('guests')} ${t('property.guests')}` : ''}
          </p>
        ) : null}

        <form className="theme-card mt-6 grid gap-3 rounded-2xl border border-black/10 p-4 md:grid-cols-4">
          <label className="text-sm theme-muted">
            {t('plus.neighborhood')}
            <select
              className="mt-1 w-full border border-line bg-transparent px-2 py-2 text-sm text-[var(--surface-fg)]"
              value={neighborhood}
              onChange={(e) => setFilter('neighborhood', e.target.value)}
            >
              <option value="">{t('plus.all')}</option>
              {neighborhoods.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm theme-muted">
            {t('plus.maxPrice')}
            <input
              type="number"
              min={0}
              className="mt-1 w-full border border-line bg-transparent px-2 py-2 text-sm"
              value={maxPrice || ''}
              onChange={(e) => setFilter('max', e.target.value)}
            />
          </label>
          <label className="text-sm theme-muted">
            {t('plus.bedrooms')}
            <input
              type="number"
              min={0}
              className="mt-1 w-full border border-line bg-transparent px-2 py-2 text-sm"
              value={bedrooms || ''}
              onChange={(e) => setFilter('beds', e.target.value)}
            />
          </label>
          <div className="flex flex-wrap items-end gap-3 pb-2 text-sm">
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={wifi} onChange={(e) => setFilter('wifi', e.target.checked ? '1' : '')} />
              {t('plus.wifi')}
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={parking} onChange={(e) => setFilter('parking', e.target.checked ? '1' : '')} />
              {t('plus.parking')}
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={ac} onChange={(e) => setFilter('ac', e.target.checked ? '1' : '')} />
              {t('plus.ac')}
            </label>
          </div>
        </form>

        {isLoading ? (
          <Loader size="md" className="mt-14" />
        ) : null}
        {!isLoading && visible.length === 0 ? <p className="mt-10">{t('plus.noMatch')}</p> : null}
        <div className="mt-14 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {visible.map((property) => (
            <PropertyCard key={property.id} property={property} promotions={promotions} lang={i18n.language} query={query} />
          ))}
        </div>
      </div>
    </div>
  )
}
