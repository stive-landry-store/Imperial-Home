import type { Workbook, Worksheet } from 'exceljs'
import { renderBrandBanner, renderBrandFooter, type BrandHead } from './invoice'
import { buildReport, sheetTotals, STATUS_COLOR, STATUS_LABEL, todayLong, type Report, type SheetSpec } from './reservationReport'
import type { Reservation } from '../types/database'
import type { VehicleRental } from './vehicles'

const BLACK = 'FF0A0907'
const GOLD = 'FFD4AF6A'
const CREAM = 'FFFBF6EA'
const WHITE = 'FFFFFFFF'
const INK = 'FF1B1710'
const LINE = 'FFE4D6B3'
const MONEY = '#,##0" FCFA"'

const solid = (argb: string) => ({ type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb } })

function colLetter(n: number) {
  let s = ''
  let x = n
  while (x > 0) {
    s = String.fromCharCode(65 + ((x - 1) % 26)) + s
    x = Math.floor((x - 1) / 26)
  }
  return s
}

async function canvasPng(canvas: HTMLCanvasElement) {
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'))
  return blob ? await blob.arrayBuffer() : null
}

type Images = { addBanner: (sheet: Worksheet, head: BrandHead, widths: number[]) => Promise<void>; addFooter: (sheet: Worksheet, widths: number[], row: number) => Promise<void> }

function imageFactory(workbook: Workbook): Images {
  let footerId: number | null | undefined
  const pxWidth = (widths: number[]) => widths.reduce((sum, w) => sum + Math.trunc(w * 7 + 5), 0)
  return {
    async addBanner(sheet, head, widths) {
      const buffer = await canvasPng(await renderBrandBanner(head))
      const width = pxWidth(widths)
      const height = Math.round((width * 300) / 1000)
      const perRowPt = (height * 0.75) / 5
      for (let r = 1; r <= 5; r += 1) sheet.getRow(r).height = perRowPt
      if (!buffer) return
      const id = workbook.addImage({ buffer, extension: 'png' })
      sheet.addImage(id, `A1:${colLetter(widths.length)}5`)
    },
    async addFooter(sheet, widths, row) {
      if (footerId === undefined) {
        const buffer = await canvasPng(await renderBrandFooter())
        footerId = buffer ? workbook.addImage({ buffer, extension: 'png' }) : null
      }
      if (footerId === null) return
      const width = pxWidth(widths)
      const height = Math.round((width * 92) / 1000)
      const rows = 4
      for (let r = 0; r < rows; r += 1) sheet.getRow(row + r).height = (height * 0.75) / rows
      sheet.addImage(footerId, `A${row}:${colLetter(widths.length)}${row + rows - 1}`)
    },
  }
}

function newSheet(workbook: Workbook, name: string) {
  return workbook.addWorksheet(name, {
    views: [{ state: 'frozen', ySplit: 6, showGridLines: false }],
    pageSetup: { orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0, paperSize: 9 },
  })
}

function headerRow(sheet: Worksheet, labels: { header: string; align?: string }[]) {
  const head = sheet.getRow(6)
  head.height = 28
  labels.forEach((c, i) => {
    const cell = head.getCell(i + 1)
    cell.value = c.header.toUpperCase()
    cell.fill = solid(BLACK)
    cell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: GOLD } }
    cell.alignment = { vertical: 'middle', horizontal: (c.align as 'left') ?? 'left', indent: c.align === 'center' ? 0 : 1 }
    cell.border = { bottom: { style: 'medium', color: { argb: GOLD } } }
  })
}

function totalLine(
  sheet: Worksheet,
  rowNo: number,
  cols: number,
  moneyCol: number,
  label: string,
  formula: string,
  result: number,
  style: 'black' | 'gold',
) {
  const row = sheet.getRow(rowNo)
  row.height = style === 'black' ? 34 : 28
  const fg = style === 'black' ? GOLD : INK
  for (let c = 1; c <= cols; c += 1) {
    const cell = row.getCell(c)
    cell.fill = solid(style === 'black' ? BLACK : 'FFF3E3B8')
    cell.font = { name: 'Calibri', size: style === 'black' ? 13 : 12, bold: true, color: { argb: fg } }
    cell.alignment = { vertical: 'middle' }
  }
  sheet.mergeCells(rowNo, 1, rowNo, moneyCol - 1)
  const labelCell = row.getCell(1)
  labelCell.value = label
  labelCell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 }
  const money = row.getCell(moneyCol)
  money.value = { formula, result }
  money.numFmt = MONEY
  money.alignment = { vertical: 'middle', horizontal: 'right', indent: 1 }
}

async function buildDataSheet(workbook: Workbook, images: Images, spec: SheetSpec, today: string) {
  const sheet = newSheet(workbook, spec.name)
  const cols = spec.columns.length
  const widths = spec.columns.map((c) => c.width)
  sheet.columns = widths.map((width) => ({ width }))
  await images.addBanner(sheet, { top: 'RAPPORT DES', bottom: 'RÉSERVATIONS', tagline: [spec.title, `Édité le ${today}`] }, widths)
  headerRow(sheet, spec.columns)

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
      cell.fill = solid(bg)
      cell.alignment = { vertical: 'middle', horizontal: c.align ?? 'left', indent: c.align === 'center' ? 0 : 1 }
      cell.border = { bottom: { style: 'thin', color: { argb: LINE } } }
      if (c.money) cell.numFmt = MONEY
      if (isStatus) {
        const tone = STATUS_COLOR[raw] ?? STATUS_COLOR.expired
        cell.fill = solid(`FF${tone.bg}`)
        cell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: `FF${tone.fg}` } }
      }
    })
  })

  const last = first + spec.rows.length - 1
  const moneyCol = spec.totalColumn + 1
  const statusL = colLetter(spec.statusColumn + 1)
  const moneyL = colLetter(moneyCol)
  const range = (l: string) => `${l}${first}:${l}${Math.max(last, first)}`
  const { total, active } = sheetTotals(spec)
  const count = spec.rows.length
  totalLine(
    sheet,
    last + 2,
    cols,
    moneyCol,
    `TOTAL CUMULÉ — toutes les ${spec.noun}s (${count})`,
    `SUM(${range(moneyL)})`,
    total,
    'black',
  )
  totalLine(
    sheet,
    last + 3,
    cols,
    moneyCol,
    'dont hors annulées et expirées',
    `SUMIFS(${range(moneyL)},${range(statusL)},"<>Annulée",${range(statusL)},"<>Expirée")`,
    active,
    'gold',
  )
  await images.addFooter(sheet, widths, last + 5)
  sheet.autoFilter = { from: { row: 6, column: 1 }, to: { row: 6, column: cols } }
}

async function buildSummarySheet(workbook: Workbook, images: Images, report: Report, today: string) {
  const sheet = newSheet(workbook, 'Résumé')
  const widths = [34, 16, 26, 26]
  sheet.columns = widths.map((width) => ({ width }))
  await images.addBanner(sheet, { top: 'RAPPORT DES', bottom: 'RÉSERVATIONS', tagline: ['Résumé général', `Édité le ${today}`] }, widths)
  headerRow(sheet, [
    { header: 'Catégorie' },
    { header: 'Nombre', align: 'center' },
    { header: 'Total cumulé', align: 'right' },
    { header: 'Hors annulées', align: 'right' },
  ])
  report.summary.forEach((line, i) => {
    const row = sheet.getRow(7 + i)
    row.height = 26
    const bg = i % 2 === 0 ? WHITE : CREAM
    const values = [line.label, line.count, line.total, line.active]
    values.forEach((value, c) => {
      const cell = row.getCell(c + 1)
      cell.value = value
      cell.fill = solid(bg)
      cell.font = { name: 'Calibri', size: 12, bold: c === 0, color: { argb: INK } }
      cell.alignment = { vertical: 'middle', horizontal: c === 0 ? 'left' : c === 1 ? 'center' : 'right', indent: c === 1 ? 0 : 1 }
      cell.border = { bottom: { style: 'thin', color: { argb: LINE } } }
      if (c >= 2) cell.numFmt = MONEY
    })
  })
  const end = 7 + report.summary.length - 1
  const row = sheet.getRow(end + 2)
  row.height = 36
  const cells: [string | number, string][] = [
    ['TOTAL GÉNÉRAL CUMULÉ', 'left'],
    [report.grandCount, 'center'],
    [report.grandTotal, 'right'],
    [report.grandActive, 'right'],
  ]
  cells.forEach(([value, align], c) => {
    const cell = row.getCell(c + 1)
    cell.value = c === 2 ? { formula: `SUM(C7:C${end})`, result: report.grandTotal } : c === 3 ? { formula: `SUM(D7:D${end})`, result: report.grandActive } : c === 1 ? { formula: `SUM(B7:B${end})`, result: report.grandCount } : value
    cell.fill = solid(BLACK)
    cell.font = { name: 'Calibri', size: 13, bold: true, color: { argb: GOLD } }
    cell.alignment = { vertical: 'middle', horizontal: align as 'left', indent: align === 'center' ? 0 : 1 }
    if (c >= 2) cell.numFmt = MONEY
  })
  await images.addFooter(sheet, widths, end + 4)
}

export async function downloadReservationsExcel(stays: Reservation[], rentals: VehicleRental[]) {
  const [{ default: ExcelJS }, report] = await Promise.all([import('exceljs'), buildReport(stays, rentals)])
  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'Impérial Home'
  workbook.created = new Date()
  const images = imageFactory(workbook)
  const today = todayLong()
  await buildSummarySheet(workbook, images, report, today)
  for (const spec of report.sheets) await buildDataSheet(workbook, images, spec, today)

  const buffer = await workbook.xlsx.writeBuffer()
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `imperial-home-reservations-${new Date().toISOString().slice(0, 10)}.xlsx`
  link.click()
  URL.revokeObjectURL(url)
}
