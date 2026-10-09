import type { DiscountType } from '../types/database'

export type PromoInput = {
  discount_type: DiscountType
  discount_value: number
} | null | undefined

export function applyPromotion(baseXaf: number, promo: PromoInput): number {
  if (!promo || baseXaf <= 0) return 0
  if (promo.discount_type === 'percent') {
    return Math.min(baseXaf, Math.floor((baseXaf * Number(promo.discount_value)) / 100))
  }
  return Math.min(baseXaf, Math.floor(Number(promo.discount_value)))
}

export function pickBestPromotion<T extends PromoInput & { discount_type: DiscountType; discount_value: number }>(
  baseXaf: number,
  promos: T[],
): T | null {
  if (!promos.length) return null
  let best: T | null = null
  let bestValue = -1
  for (const promo of promos) {
    const value = applyPromotion(baseXaf, promo)
    if (value > bestValue) {
      best = promo
      bestValue = value
    }
  }
  return best
}

export type StayFees = {
  cleaningFeeXaf?: number
  depositXaf?: number
  weeklyPercent?: number
  monthlyPercent?: number
  servicesXaf?: number
}

export function quoteStay(nightlyRate: number, nights: number, promo: PromoInput, fees?: StayFees) {
  const safeNights = Math.max(0, nights)
  const base = nightlyRate * safeNights
  const discount = applyPromotion(base, promo)
  const cleaning = Math.max(0, fees?.cleaningFeeXaf ?? 0)
  const deposit = Math.max(0, fees?.depositXaf ?? 0)
  const services = Math.max(0, fees?.servicesXaf ?? 0)
  return {
    nights: safeNights,
    base_amount_xaf: base,
    discount_xaf: discount,
    cleaning_fee_xaf: cleaning,
    deposit_xaf: deposit,
    services_xaf: services,
    long_stay: false,
    total_amount_xaf: base - discount + cleaning + deposit + services,
  }
}
