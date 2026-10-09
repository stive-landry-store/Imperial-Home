import { describe, expect, it } from 'vitest'
import { nightsInMonth } from './occupancy'

describe('nightsInMonth', () => {
  it('counts only the nights that fall inside the month', () => {
    expect(nightsInMonth('2026-10-30', '2026-11-03', 2026, 9)).toBe(2)
    expect(nightsInMonth('2026-10-02', '2026-10-05', 2026, 9)).toBe(3)
  })

  it('returns zero when the stay misses the month', () => {
    expect(nightsInMonth('2026-09-01', '2026-09-04', 2026, 9)).toBe(0)
  })
})
