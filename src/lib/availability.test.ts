import { describe, expect, it } from 'vitest'
import { rangesOverlap, stayAfterReserved, stayIsAvailable } from './availability'

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

const reserved89 = [{ start_date: '2026-10-08', end_date: '2026-10-10' }]

describe('stayAfterReserved', () => {
  it('starts the same number of nights after a reserved block that fills the selection', () => {
    expect(stayAfterReserved('2026-10-08', '2026-10-10', reserved89)).toEqual({
      checkIn: '2026-10-10',
      checkOut: '2026-10-12',
      shifted: true,
    })
  })

  it('drops reserved nights and keeps the free nights after them', () => {
    expect(stayAfterReserved('2026-10-08', '2026-10-12', reserved89)).toEqual({
      checkIn: '2026-10-10',
      checkOut: '2026-10-12',
      shifted: true,
    })
  })

  it('leaves a stay that already starts after the reserved days', () => {
    expect(stayAfterReserved('2026-10-10', '2026-10-12', reserved89)).toEqual({
      checkIn: '2026-10-10',
      checkOut: '2026-10-12',
      shifted: false,
    })
  })

  it('does nothing when nothing is reserved', () => {
    expect(stayAfterReserved('2026-10-10', '2026-10-12', [])).toEqual({
      checkIn: '2026-10-10',
      checkOut: '2026-10-12',
      shifted: false,
    })
  })
})
