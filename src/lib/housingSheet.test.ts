import { describe, expect, it } from 'vitest'
import { emptyHousingSheet, housingSheetToRow } from './housingSheet'

describe('housingSheetToRow', () => {
  it('sends only guest fields for guests and nulls empty dates', () => {
    const data = emptyHousingSheet()
    data.guest_name = 'Ada'
    data.arrival_date = ''
    data.wifi_name = 'should-not-save'
    const row = housingSheetToRow(data, 'res-1', 'guest')
    expect(row).toMatchObject({
      reservation_id: 'res-1',
      guest_name: 'Ada',
      arrival_date: null,
    })
    expect(row).not.toHaveProperty('wifi_name')
  })

  it('includes reception fields for admin', () => {
    const data = emptyHousingSheet()
    data.wifi_name = 'Imperial-Guest'
    const row = housingSheetToRow(data, 'res-1', 'admin')
    expect(row).toMatchObject({ wifi_name: 'Imperial-Guest', reception_phone: '674092263' })
  })
})
