import { jsPDF } from 'jspdf'
import { renderBrandBanner, renderBrandFooter } from './invoice'
import { buildReport, sheetTotals, STATUS_COLOR, STATUS_LABEL, todayLong, type SheetSpec } from './reservationReport'
import type { Reservation } from '../types/database'
import type { VehicleRental } from './vehicles'

type PdfColumn = { label: string; w: number; align?: 'left' | 'center' | 'right'; status?: boolean; bold?: boolean; get: (row: (string | number)[]) => string }

const money = (n: number) => `${Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ')} FCFA`
const range = (row: (string | number)[], a: number, b: number) => `${row[a]}  -  ${row[b]}`

const STAY_COLUMNS: PdfColumn[] = [
  { label: 'CODE', w: 30, bold: true, get: (r) => String(r[0]) },
  { label: 'MATRICULE', w: 22, align: 'center', get: (r) => String(r[1]) },
  { label: 'APPARTEMENT', w: 30, get: (r) => String(r[2]) },
  { label: 'CLIENT', w: 32, get: (r) => String(r[3]) },
  { label: 'SÉJOUR', w: 34, align: 'center', get: (r) => range(r, 4, 5) },
  { label: 'STATUT', w: 22, align: 'center', status: true, get: (r) => String(r[7]) },
  { label: 'TOTAL', w: 20, align: 'right', get: (r) => money(Number(r[8])) },
]

const CAR_COLUMNS: PdfColumn[] = [
  { label: 'CODE', w: 30, bold: true, get: (r) => String(r[0]) },
  { label: 'VÉHICULE', w: 40, get: (r) => String(r[1]) },
  { label: 'PÉRIODE', w: 38, align: 'center', get: (r) => range(r, 2, 3) },
  { label: 'CHAUFFEUR', w: 20, align: 'center', get: (r) => String(r[5]) },
  { label: 'STATUT', w: 24, align: 'center', status: true, get: (r) => String(r[6]) },
  { label: 'TOTAL', w: 38, align: 'right', get: (r) => money(Number(r[7])) },
]

const hex = (value: string): [number, number, number] => [
  parseInt(value.slice(0, 2), 16),
  parseInt(value.slice(2, 4), 16),
  parseInt(value.slice(4, 6), 16),
]

export async function downloadReservationsPdf(stays: Reservation[], rentals: VehicleRental[]) {
  const [report, banner, footer] = await Promise.all([
    buildReport(stays, rentals),
    renderBrandBanner({ top: 'RAPPORT DES', bottom: 'RÉSERVATIONS', tagline: ['Suivi des séjours et des', `locations — édité le ${todayLong()}`] }),
    renderBrandFooter(),
  ])
  const bannerImg = banner.toDataURL('image/jpeg', 0.92)
  const footerImg = footer.toDataURL('image/jpeg', 0.92)
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const PW = 210
  const PH = 297
  const M = 10
  const FOOT_H = (PW * 92) / 1000
  const BOTTOM = PH - FOOT_H - 4

  const paper = () => {
    doc.setFillColor(251, 245, 230)
    doc.rect(0, 0, PW, PH, 'F')
    doc.addImage(footerImg, 'JPEG', 0, PH - FOOT_H, PW, FOOT_H)
  }

  let y = 0
  const newPage = (first: boolean) => {
    if (!first) doc.addPage()
    paper()
    if (first) {
      const bh = (PW * 300) / 1000
      doc.addImage(bannerImg, 'JPEG', 0, 0, PW, bh)
      y = bh + 6
    } else {
      doc.setFillColor(10, 9, 7)
      doc.rect(0, 0, PW, 14, 'F')
      doc.setFillColor(212, 175, 106)
      doc.rect(0, 14, PW, 1, 'F')
      doc.setTextColor(212, 175, 106)
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(10)
      doc.text('IMPÉRIAL HOME', M, 9, { charSpace: 1.2 })
      y = 22
    }
  }
  const ensure = (h: number) => {
    if (y + h > BOTTOM) newPage(false)
  }

  const header = (columns: PdfColumn[]) => {
    doc.setFillColor(10, 9, 7)
    doc.roundedRect(M, y, PW - 2 * M, 8, 1.5, 1.5, 'F')
    doc.setTextColor(212, 175, 106)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(7)
    let x = M
    columns.forEach((c) => {
      const tx = c.align === 'center' ? x + c.w / 2 : c.align === 'right' ? x + c.w - 2 : x + 2
      doc.text(c.label, tx, y + 5.2, { align: c.align ?? 'left' })
      x += c.w
    })
    y += 8
  }

  const table = (spec: SheetSpec, columns: PdfColumn[]) => {
    ensure(40)
    doc.setTextColor(138, 98, 36)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(12)
    doc.text(spec.title.toUpperCase(), M, y + 4, { charSpace: 0.6 })
    y += 8
    header(columns)
    if (spec.rows.length === 0) {
      doc.setFont('helvetica', 'italic')
      doc.setFontSize(9)
      doc.setTextColor(111, 101, 86)
      doc.text('Aucune réservation.', M + 2, y + 6)
      y += 10
    }
    spec.rows.forEach((row, i) => {
      if (y + 7 > BOTTOM) {
        newPage(false)
        header(columns)
      }
      if (i % 2 === 0) doc.setFillColor(255, 255, 255)
      else doc.setFillColor(251, 246, 234)
      doc.rect(M, y, PW - 2 * M, 7, 'F')
      doc.setDrawColor(228, 214, 179)
      doc.setLineWidth(0.15)
      doc.line(M, y + 7, PW - M, y + 7)
      let x = M
      columns.forEach((c) => {
        const text = c.get(row)
        doc.setFontSize(7.5)
        doc.setFont('helvetica', c.bold || c.status ? 'bold' : 'normal')
        if (c.status) {
          const tone = STATUS_COLOR[text] ?? STATUS_COLOR.expired
          doc.setFillColor(...hex(tone.bg))
          doc.roundedRect(x + 1.5, y + 1.2, c.w - 3, 4.6, 2.3, 2.3, 'F')
          doc.setTextColor(...hex(tone.fg))
          doc.text(STATUS_LABEL[text] ?? text, x + c.w / 2, y + 4.5, { align: 'center' })
        } else {
          doc.setTextColor(27, 23, 16)
          const tx = c.align === 'center' ? x + c.w / 2 : c.align === 'right' ? x + c.w - 2 : x + 2
          const fitted = doc.splitTextToSize(text, c.w - 3)[0] ?? ''
          doc.text(fitted, tx, y + 4.6, { align: c.align ?? 'left' })
        }
        x += c.w
      })
      y += 7
    })
    const { total } = sheetTotals(spec)
    ensure(12)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8.5)
    doc.setTextColor(138, 98, 36)
    doc.text(`${spec.rows.length} ${spec.noun}${spec.rows.length > 1 ? 's' : ''}  ·  sous-total : ${money(total)}`, PW - M, y + 6, { align: 'right' })
    y += 12
  }

  newPage(true)
  table(report.sheets[0], STAY_COLUMNS)
  table(report.sheets[1], CAR_COLUMNS)

  ensure(36)
  doc.setFillColor(10, 9, 7)
  doc.roundedRect(M, y, PW - 2 * M, 15, 3, 3, 'F')
  doc.setDrawColor(212, 175, 106)
  doc.setLineWidth(0.5)
  doc.roundedRect(M, y, PW - 2 * M, 15, 3, 3, 'S')
  doc.setTextColor(212, 175, 106)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9.5)
  doc.text(`TOTAL CUMULÉ — TOUTES LES RÉSERVATIONS (${report.grandCount})`, M + 5, y + 9.2, { charSpace: 0.3 })
  doc.setFontSize(14)
  doc.text(money(report.grandTotal), PW - M - 5, y + 9.8, { align: 'right' })
  y += 18
  doc.setFillColor(243, 227, 184)
  doc.roundedRect(M, y, PW - 2 * M, 11, 3, 3, 'F')
  doc.setTextColor(27, 23, 16)
  doc.setFontSize(9)
  doc.text('dont hors annulées et expirées', M + 5, y + 7)
  doc.setFontSize(11)
  doc.text(money(report.grandActive), PW - M - 5, y + 7.2, { align: 'right' })

  doc.save(`imperial-home-reservations-${new Date().toISOString().slice(0, 10)}.pdf`)
}
