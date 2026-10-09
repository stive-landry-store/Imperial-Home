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
        <p className="text-[13px] tracking-[0.32em] text-[#d4af6a] uppercase">{t('hero.kicker')}</p>
        <h1 className="mt-3 font-display text-5xl">{t('nav.map')}</h1>
        <p className="mt-4 max-w-xl theme-muted">{t('plus.mapLead')}</p>
        <div className="mt-8 overflow-hidden border border-[#d4af6a]/30">
          {isLoading ? <Skeleton className="h-[28rem]" /> : <PropertyMap properties={properties} />}
        </div>
      </div>
    </div>
  )
}
