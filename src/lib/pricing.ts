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

export function quoteStay(nightlyRate: number, nights: number, promo: PromoInput) {
  const base = nightlyRate * Math.max(0, nights)
  const discount = applyPromotion(base, promo)
  return {
    nights,
    base_amount_xaf: base,
    discount_xaf: discount,
    total_amount_xaf: base - discount,
  }
}
