import { useEffect, useState } from 'react'
import { Helmet } from 'react-helmet-async'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { usePublishedProperties } from '../../hooks/useSite'
import { compareIds } from '../../lib/savedStays'
import { formatXaf, localized } from '../../lib/format'
import { Skeleton } from '../../components/ui/Skeleton'
import { Live } from '../../components/i18n/Live'

export function ComparePage() {
  const { t, i18n } = useTranslation()
  const { data: properties = [], isLoading } = usePublishedProperties()
  const [ids, setIds] = useState<string[]>([])

  useEffect(() => {
    const sync = () => setIds(compareIds())
    sync()
    window.addEventListener('ih-saved-stays', sync)
    return () => window.removeEventListener('ih-saved-stays', sync)
  }, [])

  const chosen = properties.filter((property) => ids.includes(property.id))

  return (
    <div className="theme-page min-h-svh">
      <div className="mx-auto max-w-6xl px-4 pt-36 pb-24">
        <Helmet>
          <title>{t('plus.compareTitle')} | Impérial Home</title>
        </Helmet>
        <h1 className="font-display text-5xl">{t('plus.compareTitle')}</h1>
        {isLoading ? <Skeleton className="mt-8 h-40" /> : null}
        {!isLoading && chosen.length === 0 ? <p className="mt-6 theme-muted">{t('plus.compareEmpty')}</p> : null}
        {chosen.length > 0 ? (
          <div className="mt-8 overflow-x-auto">
            <table className="w-full min-w-[40rem] border-collapse text-sm">
              <thead>
                <tr>
                  <th className="p-3 text-left" />
                  {chosen.map((property) => (
                    <th key={property.id} className="p-3 text-left font-display text-2xl font-normal">
                      <Link to={`/properties/${property.slug}`} className="text-[#d4af6a]">
                        {property.name}
                      </Link>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(
                  [
                    [t('plus.neighborhood'), (p: (typeof chosen)[number]) => p.neighborhood || p.city],
                    [t('property.guests'), (p: (typeof chosen)[number]) => String(p.capacity)],
                    [t('plus.bedrooms'), (p: (typeof chosen)[number]) => String(p.bedrooms)],
                    [t('properties.perNight'), (p: (typeof chosen)[number]) => formatXaf(p.nightly_rate_xaf)],
                    [
                      t('property.amenities'),
                      (p: (typeof chosen)[number]) =>
                        (p.property_amenities ?? [])
                          .map((item) => localized(item.amenities.name_en, item.amenities.name_fr, i18n.language))
                          .join(', '),
                    ],
                  ] as const
                ).map(([label, value]) => (
                  <tr key={label} className="border-t border-[#d4af6a]/20">
                    <th className="p-3 text-left font-normal theme-muted">{label}</th>
                    {chosen.map((property) => (
                      <td key={property.id} className="p-3 align-top">
                        <Live text={String(value(property) ?? '')} />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </div>
    </div>
  )
}
