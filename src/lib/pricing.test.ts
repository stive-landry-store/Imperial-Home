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
})
