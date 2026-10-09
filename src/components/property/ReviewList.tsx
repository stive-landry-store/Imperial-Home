import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { fetchPublishedReviews } from '../../lib/guest'

export function ReviewList({ propertyId }: { propertyId: string }) {
  const { t } = useTranslation()
  const { data = [] } = useQuery({
    queryKey: ['reviews', propertyId],
    queryFn: () => fetchPublishedReviews(propertyId),
  })
  const average = data.length ? data.reduce((sum, review) => sum + review.rating, 0) / data.length : 0

  return (
    <section className="mt-10">
      <h2 className="font-display text-3xl">{t('plus.reviews')}</h2>
      {data.length === 0 ? (
        <p className="mt-3 text-sm theme-muted">{t('plus.noReviews')}</p>
      ) : (
        <>
          <p className="mt-2 text-[#d4af6a]">{average.toFixed(1)} / 5 · {data.length}</p>
          <ul className="mt-4 space-y-4">
            {data.map((review) => (
              <li key={review.id} className="border border-[#d4af6a]/25 p-4">
                <p className="text-[#d4af6a]">{'★'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)}</p>
                <p className="mt-2 text-sm">{review.body}</p>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  )
}
