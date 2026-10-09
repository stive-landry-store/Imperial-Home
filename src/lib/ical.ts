import type { Reservation } from '../types/database'

function stamp(iso: string) {
  return iso.slice(0, 10).replaceAll('-', '')
}

export function buildIcal(propertyName: string, reservations: Reservation[]) {
  const events = reservations
    .filter((r) => r.status === 'pending' || r.status === 'payment_processing' || r.status === 'confirmed')
    .map(
      (r) =>
        [
          'BEGIN:VEVENT',
          `UID:${r.public_code}@imperial.home`,
          `DTSTART;VALUE=DATE:${stamp(r.check_in)}`,
          `DTEND;VALUE=DATE:${stamp(r.check_out)}`,
          `SUMMARY:Imperial Home — ${propertyName}`,
          'END:VEVENT',
        ].join('\r\n'),
    )
    .join('\r\n')

  return ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Imperial Home//Calendar//FR', events, 'END:VCALENDAR', ''].join(
    '\r\n',
  )
}
