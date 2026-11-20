import { useQuery } from '@tanstack/react-query'
import { Helmet } from 'react-helmet-async'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { BadgeCheck, Star } from 'lucide-react'
import { fetchPublicReviews } from '../../lib/reviews'
import { SITE_ORIGIN } from '../../lib/seo'

// Verified guest reviews (every review is tied to a real stay).
// Conçu par stive landry store (NYAMI TCHOUPE STIVE LANDRY).

function Stars({ value }: { value: number }) {
  return (
    <span className="inline-flex gap-0.5 text-[#d4af6a]" aria-label={`${value}/5`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <Star key={i} className={`h-4 w-4 ${i < value ? 'fill-current' : 'opacity-30'}`} />
      ))}
    </span>
  )
}

export function ReviewsPage() {
  const { t, i18n } = useTranslation()
  const { data: reviews = [], isLoading } = useQuery({ queryKey: ['public-reviews'], queryFn: () => fetchPublicReviews() })
  const average = reviews.length ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length : 0
  const jsonLd = reviews.length
    ? {
        '@context': 'https://schema.org',
        '@type': 'LodgingBusiness',
        name: 'Imperial Home',
        url: `${SITE_ORIGIN}/`,
        aggregateRating: { '@type': 'AggregateRating', ratingValue: average.toFixed(1), reviewCount: reviews.length, bestRating: 5 },
        review: reviews.slice(0, 20).map((r) => ({
          '@type': 'Review',
          reviewRating: { '@type': 'Rating', ratingValue: r.rating, bestRating: 5 },
          author: { '@type': 'Person', name: r.guest_name },
          datePublished: r.created_at.slice(0, 10),
          reviewBody: r.body,
        })),
      }
    : null

  return (
    <div className="theme-page mx-auto max-w-4xl px-4 pt-28 pb-20">
      <Helmet>
        <title>{`${t('reviewsPage.title')} | Imperial Home`}</title>
        <meta name="description" content={t('reviewsPage.lead')} />
        <link rel="canonical" href={`${SITE_ORIGIN}/avis`} />
        {jsonLd ? <script type="application/ld+json">{JSON.stringify(jsonLd)}</script> : null}
      </Helmet>
      <h1 className="font-display text-4xl">{t('reviewsPage.title')}</h1>
      <p className="mt-2 theme-muted">{t('reviewsPage.lead')}</p>
      {reviews.length ? (
        <div className="theme-card mt-8 flex items-center gap-6 rounded-3xl p-6">
          <p className="font-display text-5xl text-[#d4af6a]">
            <span className="ih-count" data-count={Math.round(average * 10)} data-suffix="">{(average * 10).toFixed(0)}</span>
            <span className="text-2xl">/50</span>
          </p>
          <div>
            <Stars value={Math.round(average)} />
            <p className="mt-1 text-sm theme-muted">{t('reviewsPage.count', { count: reviews.length })}</p>
          </div>
        </div>
      ) : null}
      {isLoading ? null : reviews.length === 0 ? (
        <p className="mt-10 theme-muted">{t('reviewsPage.empty')}</p>
      ) : (
        <ul className="mt-8 grid gap-4 md:grid-cols-2">
          {reviews.map((r) => (
            <li key={r.id} className="ih-card theme-card rounded-3xl p-5">
              <div className="flex items-center justify-between gap-3">
                <Stars value={r.rating} />
                {r.verified ? (
                  <span className="inline-flex items-center gap-1 text-xs text-emerald-400">
                    <BadgeCheck className="h-4 w-4" /> {t('reviewsPage.verified')}
                  </span>
                ) : null}
              </div>
              <p className="mt-3 text-sm leading-relaxed">“{r.body}”</p>
              <p className="mt-4 text-xs theme-muted">
                {r.guest_name} ·{' '}
                {new Date(`${r.stay_month}T12:00:00`).toLocaleDateString(i18n.language, { month: 'long', year: 'numeric' })} ·{' '}
                <Link to={`/properties/${encodeURIComponent(r.property_slug)}`} className="ih-link text-[#d4af6a]">
                  {r.property_name}
                </Link>
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
