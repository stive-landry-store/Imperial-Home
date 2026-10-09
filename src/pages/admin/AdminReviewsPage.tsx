import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Helmet } from 'react-helmet-async'
import { useTranslation } from 'react-i18next'
import { fetchAllReviews, setReviewStatus } from '../../lib/guest'
import { Button } from '../../components/ui/Button'

export function AdminReviewsPage() {
  const { t } = useTranslation()
  const client = useQueryClient()
  const { data = [] } = useQuery({ queryKey: ['admin-reviews'], queryFn: fetchAllReviews })
  const update = useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'published' | 'hidden' }) => setReviewStatus(id, status),
    onSuccess: () => void client.invalidateQueries({ queryKey: ['admin-reviews'] }),
  })

  return (
    <div className="px-4 py-5 md:p-10">
      <Helmet>
        <title>{t('admin.reviewsAdmin')} | Imperial Home</title>
      </Helmet>
      <h1 className="font-display text-4xl">{t('admin.reviewsAdmin')}</h1>
      <ul className="mt-8 space-y-3">
        {data.map((review) => (
          <li key={review.id} className="surface-light border border-line p-4">
            <p className="text-[#d4af6a]">{'★'.repeat(review.rating)}</p>
            <p className="mt-2 text-sm">{review.body}</p>
            <p className="mt-1 text-xs uppercase tracking-wider theme-muted">{review.status}</p>
            <Button
              variant="outline"
              className="mt-3 px-3 py-2 text-[11px]"
              onClick={() =>
                update.mutate({ id: review.id, status: review.status === 'published' ? 'hidden' : 'published' })
              }
            >
              {review.status === 'published' ? t('plus.hideReview') : t('plus.showReview')}
            </Button>
          </li>
        ))}
      </ul>
    </div>
  )
}
