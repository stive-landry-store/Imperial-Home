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
      {quote.discount_xaf > 0 ? (
        <div className="flex justify-between text-[#d4af6a]">
          <span>{quote.long_stay ? t('plus.longStay') : quote.promotion_name || t('plus.promoCode')}</span>
          <span>− {formatXaf(quote.discount_xaf)}</span>
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
      <p className="pt-1 text-lg">{formatXaf(quote.total_amount_xaf)}</p>
      <p className="text-xs theme-muted">
        {formatEur(indicativeEur(quote.total_amount_xaf))} · {t('plus.eurHint')}
      </p>
    </div>
  )
}
