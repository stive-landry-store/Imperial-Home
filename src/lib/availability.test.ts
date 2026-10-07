import { describe, expect, it } from 'vitest'
import { rangesOverlap, stayIsAvailable } from './availability'

describe('availability', () => {
  it('treats stays as half-open so checkout can equal next check-in', () => {
    expect(rangesOverlap('2026-09-01', '2026-09-05', '2026-09-05', '2026-09-08')).toBe(false)
    expect(rangesOverlap('2026-09-01', '2026-09-05', '2026-09-04', '2026-09-08')).toBe(true)
  })

  it('rejects overlapping occupied ranges', () => {
    const ranges = [{ start_date: '2026-09-10', end_date: '2026-09-14' }]
    expect(stayIsAvailable('2026-09-08', '2026-09-10', ranges)).toBe(true)
    expect(stayIsAvailable('2026-09-12', '2026-09-16', ranges)).toBe(false)
  })

  it('rejects inverted date ranges', () => {
    expect(stayIsAvailable('2026-09-10', '2026-09-10', [])).toBe(false)
  })
})
