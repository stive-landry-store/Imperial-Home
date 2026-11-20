import { useTranslation } from 'react-i18next'
import type { Quote } from '../../types/database'
import { formatXaf } from '../../lib/format'
import { formatEur, indicativeEur } from '../../lib/money'

export function PriceBreakdown({ quote }: { quote: Quote }) {
  const { t } = useTranslation()
  return (
    <div className="space-y-1 text-sm">
      <div className="flex justify-between">
        <span>
          {quote.nights} {t('property.nights')}
        </span>
        <span>{formatXaf(quote.base_amount_xaf)}</span>
      </div>
      {quote.base_nightly_rate_xaf && quote.nightly_rate_xaf !== quote.base_nightly_rate_xaf ? (
        <p className="text-xs theme-muted">
          {t('pricing.averageNight', { amount: formatXaf(quote.nightly_rate_xaf) })}
        </p>
      ) : null}
      {(quote.long_stay_discount_xaf ?? 0) > 0 ? (
        <div className="ih-fade-in flex justify-between text-[#d4af6a]">
          <span>
            {t('plus.longStay')}
            {quote.long_stay_percent ? ` (−${quote.long_stay_percent} %)` : ''}
          </span>
          <span>− {formatXaf(quote.long_stay_discount_xaf ?? 0)}</span>
        </div>
      ) : null}
      {(quote.promo_discount_xaf ?? (quote.long_stay ? 0 : quote.discount_xaf)) > 0 ? (
        <div className="ih-fade-in flex justify-between text-[#d4af6a]">
          <span>{quote.promotion_name || t('plus.promoCode')}</span>
          <span>− {formatXaf(quote.promo_discount_xaf ?? quote.discount_xaf)}</span>
        </div>
      ) : null}
      {(quote.cleaning_fee_xaf ?? 0) > 0 ? (
        <div className="flex justify-between">
          <span>{t('plus.cleaning')}</span>
          <span>{formatXaf(quote.cleaning_fee_xaf ?? 0)}</span>
        </div>
      ) : null}
      {(quote.deposit_xaf ?? 0) > 0 ? (
        <div className="flex justify-between">
          <span>{t('plus.deposit')}</span>
          <span>{formatXaf(quote.deposit_xaf ?? 0)}</span>
        </div>
      ) : null}
      {(quote.services_xaf ?? 0) > 0 ? (
        <div className="flex justify-between">
          <span>{t('plus.extras')}</span>
          <span>{formatXaf(quote.services_xaf ?? 0)}</span>
        </div>
      ) : null}
      <p key={quote.total_amount_xaf} className="ih-pop pt-1 text-lg">{formatXaf(quote.total_amount_xaf)}</p>
      <p className="text-xs theme-muted">
        {formatEur(indicativeEur(quote.total_amount_xaf))} · {t('plus.eurHint')}
      </p>
    </div>
  )
}
