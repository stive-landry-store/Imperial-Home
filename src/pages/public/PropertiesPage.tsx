import { Helmet } from 'react-helmet-async'
import { useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { PropertyCard } from '../../components/property/PropertyCard'
import { usePublishedProperties, usePromotions } from '../../hooks/useSite'

export function PropertiesPage() {
  const { t, i18n } = useTranslation()
  const [params] = useSearchParams()
  const { data: properties = [], isLoading } = usePublishedProperties()
  const { data: promotions = [] } = usePromotions()
  const query = params.toString() ? `?${params.toString()}` : ''

  return (
    <div className="theme-page min-h-svh">
      <div className="mx-auto max-w-6xl px-4 pt-36 pb-24 md:px-6">
        <Helmet>
          <title>{t('properties.title')} | Impérial Home</title>
        </Helmet>
        <p className="text-[13px] tracking-[0.32em] text-[#d4af6a] uppercase">{t('hero.tagline')}</p>
        <h1 className="mt-3 font-display text-5xl tracking-[0.04em]">{t('properties.title')}</h1>
        <p className="mt-4 max-w-xl text-base theme-muted">{t('properties.lead')}</p>
        {params.get('checkIn') && params.get('checkOut') ? (
          <p className="mt-6 text-base tracking-wide text-[#d4af6a]">
            {params.get('checkIn')} → {params.get('checkOut')}
            {params.get('nights') ? ` · ${params.get('nights')} ${t('property.nights')}` : ''}
            {params.get('guests') ? ` · ${params.get('guests')} ${t('property.guests')}` : ''}
          </p>
        ) : null}
        {isLoading ? <p className="mt-10 theme-muted">{t('common.loading')}</p> : null}
        {!isLoading && properties.length === 0 ? <p className="mt-10">{t('properties.empty')}</p> : null}
        <div className="mt-14 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {properties.map((p) => (
          <PropertyCard key={p.id} property={p} promotions={promotions} lang={i18n.language} query={query} />
          ))}
        </div>
      </div>
    </div>
  )
}
