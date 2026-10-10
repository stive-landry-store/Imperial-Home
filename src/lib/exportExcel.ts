import type { Reservation } from '../types/database'
import { fetchPropertyIndex, propertyMatricule } from './matricule'
import { rentalVehicleName, type VehicleRental } from './vehicles'

const BLACK = 'FF0A0907'
const GOLD = 'FFD4AF6A'
const GOLD_DARK = 'FF8B6F32'
const CREAM = 'FFFBF6EA'
const WHITE = 'FFFFFFFF'
const INK = 'FF1B1710'
const LINE = 'FFE4D6B3'

const STATUS_LABEL: Record<string, string> = {
  pending: 'En attente',
  payment_processing: 'Paiement en cours',
  confirmed: 'Confirmée',
  cancelled: 'Annulée',
  expired: 'Expirée',
  completed: 'Terminée',
  requested: 'Demandée',
}

const STATUS_COLOR: Record<string, { bg: string; fg: string }> = {
  confirmed: { bg: 'FFDDF3E4', fg: 'FF1E6B3A' },
  completed: { bg: 'FFE3ECF8', fg: 'FF234A80' },
  pending: { bg: 'FFFFF0CC', fg: 'FF8A5A00' },
  requested: { bg: 'FFFFF0CC', fg: 'FF8A5A00' },
  payment_processing: { bg: 'FFFFF0CC', fg: 'FF8A5A00' },
  cancelled: { bg: 'FFFADBD8', fg: 'FF9B2218' },
  expired: { bg: 'FFEDEAE4', fg: 'FF6B6358' },
}

type Column = { header: string; width: number; align?: 'left' | 'center' | 'right'; money?: boolean; status?: boolean }
type SheetSpec = { name: string; title: string; columns: Column[]; rows: (string | number)[][]; totalColumn?: number; statusColumn?: number }

function dateFr(iso: string | null | undefined) {
  if (!iso) return ''
  const [y, m, d] = iso.slice(0, 10).split('-')
  return `${d}/${m}/${y}`
}

async function loadLogo() {
  try {
    const response = await fetch(`${import.meta.env.BASE_URL}brand/imperial-monogram.png`)
    if (!response.ok) return null
    return await response.arrayBuffer()
  } catch {
    return null
  }
}

function colLetter(n: number) {
  let s = ''
  let x = n
  while (x > 0) {
    const r = (x - 1) % 26
    s = String.fromCharCode(65 + r) + s
    x = Math.floor((x - 1) / 26)
  }
  return s
}

export async function downloadReservationsExcel(stays: Reservation[], rentals: VehicleRental[]) {
  const [{ default: ExcelJS }, index, logo] = await Promise.all([import('exceljs'), fetchPropertyIndex(), loadLogo()])
  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'Impérial Home'
  workbook.created = new Date()
  const logoId = logo ? workbook.addImage({ buffer: logo, extension: 'png' }) : null
  const today = new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })

  const staySheet: SheetSpec = {
    name: 'Appartements',
    title: 'Réservations d’appartements',
    columns: [
      { header: 'Code', width: 18 },
      { header: 'Matricule', width: 14, align: 'center' },
      { header: 'Appartement', width: 28 },
      { header: 'Client', width: 28 },
      { header: 'Arrivée', width: 14, align: 'center' },
      { header: 'Départ', width: 14, align: 'center' },
      { header: 'Nuits', width: 9, align: 'center' },
      { header: 'Statut', width: 20, align: 'center', status: true },
      { header: 'Total', width: 20, align: 'right', money: true },
    ],
    rows: stays.map((r) => [
      r.public_code,
      r.properties ? propertyMatricule(r.properties, index) : '',
      r.properties?.name ?? '',
      r.profiles?.full_name || r.profiles?.email || '',
      dateFr(r.check_in),
      dateFr(r.check_out),
      r.nights ?? 0,
      r.status,
      r.total_amount_xaf,
    ]),
    statusColumn: 7,
    totalColumn: 8,
  }

  const carSheet: SheetSpec = {
    name: 'Voitures',
    title: 'Locations de voitures',
    columns: [
      { header: 'Code', width: 18 },
      { header: 'Véhicule', width: 28 },
      { header: 'Début', width: 14, align: 'center' },
      { header: 'Fin', width: 14, align: 'center' },
      { header: 'Jours', width: 9, align: 'center' },
      { header: 'Chauffeur', width: 14, align: 'center' },
      { header: 'Statut', width: 20, align: 'center', status: true },
      { header: 'Total', width: 20, align: 'right', money: true },
    ],
    rows: rentals.map((r) => [
      r.public_code ?? '',
      rentalVehicleName(r),
      dateFr(r.start_date),
      dateFr(r.end_date),
      r.days,
      r.with_driver ? 'Avec' : 'Sans',
      r.status,
      r.total_xaf,
    ]),
    statusColumn: 6,
    totalColumn: 7,
  }

  for (const spec of [staySheet, carSheet]) buildSheet(workbook, spec, logoId, today)

  const buffer = await workbook.xlsx.writeBuffer()
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `imperial-home-reservations-${new Date().toISOString().slice(0, 10)}.xlsx`
  link.click()
  URL.revokeObjectURL(url)
}

function buildSheet(
  workbook: import('exceljs').Workbook,
  spec: SheetSpec,
  logoId: number | null,
  today: string,
) {
  const sheet = workbook.addWorksheet(spec.name, {
    views: [{ state: 'frozen', ySplit: 6, showGridLines: false }],
    pageSetup: { orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0, paperSize: 9 },
  })
  const cols = spec.columns.length
  const last = colLetter(cols)
  sheet.columns = spec.columns.map((c) => ({ width: c.width }))

  for (let r = 1; r <= 4; r += 1) {
    sheet.getRow(r).height = r === 1 || r === 4 ? 14 : 30
    for (let c = 1; c <= cols; c += 1) sheet.getCell(r, c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: BLACK } }
  }
  if (logoId !== null) sheet.addImage(logoId, { tl: { col: 0.15, row: 0.2 }, ext: { width: 78, height: 78 } })

  sheet.mergeCells(`B2:${last}2`)
  const brand = sheet.getCell('B2')
  brand.value = 'IMPÉRIAL HOME'
  brand.font = { name: 'Georgia', size: 24, bold: true, color: { argb: GOLD } }
  brand.alignment = { vertical: 'middle', horizontal: 'left', indent: 6 }

  sheet.mergeCells(`B3:${last}3`)
  const sub = sheet.getCell('B3')
  sub.value = `${spec.title}  ·  Édité le ${today}`
  sub.font = { name: 'Calibri', size: 12, color: { argb: 'FFEFE3C6' } }
  sub.alignment = { vertical: 'middle', horizontal: 'left', indent: 6 }

  sheet.mergeCells(`A5:${last}5`)
  sheet.getRow(5).height = 5
  for (let c = 1; c <= cols; c += 1) sheet.getCell(5, c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: GOLD } }

  const head = sheet.getRow(6)
  head.height = 28
  spec.columns.forEach((c, i) => {
    const cell = head.getCell(i + 1)
    cell.value = c.header.toUpperCase()
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: BLACK } }
    cell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: GOLD } }
    cell.alignment = { vertical: 'middle', horizontal: c.align ?? 'left', indent: c.align === 'center' ? 0 : 1 }
    cell.border = { bottom: { style: 'medium', color: { argb: GOLD } } }
  })

  const first = 7
  spec.rows.forEach((values, ri) => {
    const row = sheet.getRow(first + ri)
    row.height = 24
    const bg = ri % 2 === 0 ? WHITE : CREAM
    spec.columns.forEach((c, i) => {
      const cell = row.getCell(i + 1)
      const raw = values[i]
      const isStatus = c.status && typeof raw === 'string'
      cell.value = isStatus ? (STATUS_LABEL[raw] ?? raw) : raw
      cell.font = { name: 'Calibri', size: 11, color: { argb: INK }, bold: i === 0 }
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } }
      cell.alignment = { vertical: 'middle', horizontal: c.align ?? 'left', indent: c.align === 'center' ? 0 : 1 }
      cell.border = { bottom: { style: 'thin', color: { argb: LINE } } }
      if (c.money) cell.numFmt = '#,##0" FCFA"'
      if (isStatus) {
        const tone = STATUS_COLOR[raw] ?? STATUS_COLOR.expired
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: tone.bg } }
        cell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: tone.fg } }
      }
    })
  })

  const end = first + spec.rows.length
  const totalRow = sheet.getRow(end + 1)
  totalRow.height = 30
  for (let c = 1; c <= cols; c += 1) {
    const cell = totalRow.getCell(c)
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: BLACK } }
    cell.font = { name: 'Calibri', size: 12, bold: true, color: { argb: GOLD } }
    cell.alignment = { vertical: 'middle' }
  }
  totalRow.getCell(1).value = `${spec.rows.length} réservation${spec.rows.length > 1 ? 's' : ''}`
  totalRow.getCell(1).alignment = { vertical: 'middle', indent: 1 }
  if (spec.totalColumn !== undefined && spec.statusColumn !== undefined && spec.rows.length > 0) {
    const money = spec.rows
      .filter((r) => r[spec.statusColumn!] !== 'cancelled' && r[spec.statusColumn!] !== 'expired')
      .reduce((sum, r) => sum + Number(r[spec.totalColumn!] ?? 0), 0)
    const moneyCell = totalRow.getCell(spec.totalColumn + 1)
    moneyCell.value = money
    moneyCell.numFmt = '#,##0" FCFA"'
    moneyCell.alignment = { vertical: 'middle', horizontal: 'right', indent: 1 }
    const label = totalRow.getCell(spec.totalColumn)
    label.value = 'TOTAL (hors annulées)'
    label.alignment = { vertical: 'middle', horizontal: 'right', indent: 1 }
    label.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FFEFE3C6' } }
  }
  const foot = sheet.getRow(end + 3)
  sheet.mergeCells(`A${end + 3}:${last}${end + 3}`)
  foot.getCell(1).value = 'Impérial Home · Douala, Cameroun · L’art du soin, l’esprit du détail.'
  foot.getCell(1).font = { name: 'Calibri', size: 10, italic: true, color: { argb: GOLD_DARK } }
  foot.getCell(1).alignment = { horizontal: 'center' }

  sheet.autoFilter = { from: { row: 6, column: 1 }, to: { row: 6, column: cols } }
}
