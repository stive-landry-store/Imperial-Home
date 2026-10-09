import { jsPDF } from 'jspdf'
import type { Reservation } from '../types/database'
import { formatDate, formatXaf } from './format'

export function downloadInvoice(reservation: Reservation) {
  const doc = new jsPDF()
  const pay = reservation.payments?.[0]
  doc.setFont('times', 'bold')
  doc.setFontSize(22)
  doc.text('Impérial Home', 20, 24)
  doc.setFont('times', 'normal')
  doc.setFontSize(11)
  doc.text('Résidences meublées · Douala', 20, 32)
  doc.text(`Facture ${reservation.public_code}`, 20, 46)
  doc.text(reservation.properties?.name ?? '', 20, 54)
  doc.text(`${formatDate(reservation.check_in)} — ${formatDate(reservation.check_out)} · ${reservation.nights} nuits`, 20, 62)
  doc.text(`${reservation.guest_count} voyageurs`, 20, 70)
  doc.text(`Séjour : ${formatXaf(reservation.base_amount_xaf)}`, 20, 84)
  doc.text(`Réduction : ${formatXaf(reservation.discount_xaf)}`, 20, 92)
  doc.setFont('times', 'bold')
  doc.text(`Total : ${formatXaf(reservation.total_amount_xaf)}`, 20, 104)
  doc.setFont('times', 'normal')
  doc.text(`Paiement : ${pay?.status ?? reservation.status}`, 20, 116)
  doc.setFontSize(9)
  doc.text('Document établi par Impérial Home. Règlement en francs CFA (XAF).', 20, 140)
  doc.save(`${reservation.public_code}.pdf`)
}
