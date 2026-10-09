import { Helmet } from 'react-helmet-async'
import { useTranslation } from 'react-i18next'
import { usePublishedProperties } from '../../hooks/useSite'
import { PropertyMap } from '../../components/property/PropertyMap'
import { Skeleton } from '../../components/ui/Skeleton'

export function MapPage() {
  const { t } = useTranslation()
  const { data: properties = [], isLoading } = usePublishedProperties()

  return (
    <div className="theme-page min-h-svh">
      <div className="mx-auto max-w-6xl px-4 pt-36 pb-24">
        <Helmet>
          <title>{t('nav.map')} | Impérial Home</title>
          <meta name="description" content={t('plus.mapLead')} />
        </Helmet>
        <h1 className="text-2xl font-semibold">{t('nav.map')}</h1>
        <p className="mt-2 max-w-xl text-sm theme-muted">{t('plus.mapLead')}</p>
        <div className="mt-6 overflow-hidden rounded-2xl border border-black/10">
          {isLoading ? <Skeleton className="h-[28rem]" /> : <PropertyMap properties={properties} />}
        </div>
      </div>
    </div>
  )
}
