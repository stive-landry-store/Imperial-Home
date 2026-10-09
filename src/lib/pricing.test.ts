import { describe, expect, it } from 'vitest'
import { applyPromotion, pickBestPromotion, quoteStay } from './pricing'

describe('pricing', () => {
  it('applies a percent discount without stacking', () => {
    expect(applyPromotion(100_000, { discount_type: 'percent', discount_value: 10 })).toBe(10_000)
  })

  it('caps a fixed discount at the base amount', () => {
    expect(applyPromotion(20_000, { discount_type: 'fixed', discount_value: 50_000 })).toBe(20_000)
  })

  it('picks the highest-value promotion only', () => {
    const best = pickBestPromotion(100_000, [
      { discount_type: 'percent', discount_value: 10 },
      { discount_type: 'fixed', discount_value: 8_000 },
    ])
    expect(best?.discount_type).toBe('percent')
  })

  it('quotes nights × rate minus one promotion', () => {
    const q = quoteStay(55_000, 3, { discount_type: 'percent', discount_value: 10 })
    expect(q.base_amount_xaf).toBe(165_000)
    expect(q.discount_xaf).toBe(16_500)
    expect(q.total_amount_xaf).toBe(148_500)
  })

  it('applies a weekly discount when it beats the promotion', () => {
    const q = quoteStay(10_000, 7, { discount_type: 'percent', discount_value: 5 }, { weeklyPercent: 10 })
    expect(q.discount_xaf).toBe(7_000)
    expect(q.long_stay).toBe(true)
    expect(q.total_amount_xaf).toBe(63_000)
  })

  it('adds cleaning, deposit, and extras on top of the stay', () => {
    const q = quoteStay(20_000, 2, null, { cleaningFeeXaf: 5_000, depositXaf: 30_000, servicesXaf: 15_000 })
    expect(q.total_amount_xaf).toBe(90_000)
  })
})
