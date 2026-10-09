export type HousingSheetData = {
  guest_name: string
  guest_phone: string
  guest_cni: string
  arrival_date: string
  arrival_time: string
  departure_date: string
  departure_time: string
  wifi_name: string
  wifi_password: string
  guest_sign_name: string
  guest_signature: string
  reception_sign_name: string
  reception_signature: string
  receptionist_name: string
  reception_phone: string
}

export const emptyHousingSheet = (): HousingSheetData => ({
  guest_name: '',
  guest_phone: '',
  guest_cni: '',
  arrival_date: '',
  arrival_time: '14:00',
  departure_date: '',
  departure_time: '11:00',
  wifi_name: '',
  wifi_password: '',
  guest_sign_name: '',
  guest_signature: '',
  reception_sign_name: '',
  reception_signature: '',
  receptionist_name: '',
  reception_phone: '674092263',
})

export const demoHousingSheet = (): HousingSheetData => ({
  guest_name: 'Jean-Paul Mballa',
  guest_phone: '677 12 34 56',
  guest_cni: '110012345',
  arrival_date: '2026-09-12',
  arrival_time: '14:00',
  departure_date: '2026-09-16',
  departure_time: '11:00',
  wifi_name: '',
  wifi_password: '',
  guest_sign_name: 'Jean-Paul Mballa',
  guest_signature: '',
  reception_sign_name: 'Impérial Home',
  reception_signature: '',
  receptionist_name: 'Amina Ngo',
  reception_phone: '674092263',
})

export const GUEST_FIELDS: (keyof HousingSheetData)[] = [
  'guest_name',
  'guest_phone',
  'guest_cni',
  'arrival_date',
  'arrival_time',
  'departure_date',
  'departure_time',
  'guest_sign_name',
  'guest_signature',
]

export const ADMIN_ONLY_FIELDS: (keyof HousingSheetData)[] = [
  'wifi_name',
  'wifi_password',
  'reception_sign_name',
  'reception_signature',
  'receptionist_name',
  'reception_phone',
]

const blankToNull = (value: string) => (value.trim() ? value : null)

export function housingSheetToRow(
  data: HousingSheetData,
  reservationId: string,
  role: 'guest' | 'admin',
) {
  const guest = {
    reservation_id: reservationId,
    guest_name: data.guest_name,
    guest_phone: data.guest_phone,
    guest_cni: data.guest_cni,
    arrival_date: blankToNull(data.arrival_date),
    arrival_time: blankToNull(data.arrival_time),
    departure_date: blankToNull(data.departure_date),
    departure_time: blankToNull(data.departure_time),
    guest_sign_name: data.guest_sign_name,
    guest_signature: blankToNull(data.guest_signature),
    updated_at: new Date().toISOString(),
  }
  if (role === 'guest') return guest
  return {
    ...guest,
    wifi_name: data.wifi_name,
    wifi_password: data.wifi_password,
    reception_sign_name: data.reception_sign_name,
    reception_signature: blankToNull(data.reception_signature),
    receptionist_name: data.receptionist_name,
    reception_phone: data.reception_phone,
  }
}

export function rowToHousingSheet(row: Record<string, string | null | undefined>): HousingSheetData {
  return {
    guest_name: row.guest_name ?? '',
    guest_phone: row.guest_phone ?? '',
    guest_cni: row.guest_cni ?? '',
    arrival_date: row.arrival_date ?? '',
    arrival_time: (row.arrival_time ?? '14:00').slice(0, 5),
    departure_date: row.departure_date ?? '',
    departure_time: (row.departure_time ?? '11:00').slice(0, 5),
    wifi_name: row.wifi_name ?? '',
    wifi_password: row.wifi_password ?? '',
    guest_sign_name: row.guest_sign_name ?? '',
    guest_signature: row.guest_signature ?? '',
    reception_sign_name: row.reception_sign_name ?? '',
    reception_signature: row.reception_signature ?? '',
    receptionist_name: row.receptionist_name ?? '',
    reception_phone: row.reception_phone ?? '674092263',
  }
}
