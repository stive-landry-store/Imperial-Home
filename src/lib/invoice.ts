import { jsPDF } from 'jspdf'
import type { Reservation } from '../types/database'
import { formatDate, formatXaf } from './format'

const W = 1000
const H = 1414
const SCALE = 1654 / W

const INK = '#2a2118'
const MUTED = '#6f6556'
const GOLD = '#b8893b'
const GOLD_LIGHT = '#ecd08a'
const GOLD_DARK = '#8a6224'
const CREAM = '#f6ecd2'
const LINE = '#c9a45c'

const PAYMENT_LABEL: Record<string, string> = {
  successful: 'Réussi',
  pending: 'En attente',
  processing: 'En cours',
  failed: 'Échoué',
  cancelled: 'Annulé',
  refunded: 'Remboursé',
}

const RESERVATION_LABEL: Record<string, string> = {
  pending: 'En attente',
  payment_processing: 'Paiement en cours',
  confirmed: 'Confirmée',
  cancelled: 'Annulée',
  expired: 'Expirée',
  completed: 'Terminée',
}

type Ctx = CanvasRenderingContext2D

function loadImage(src: string) {
  return new Promise<HTMLImageElement | null>((resolve) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => resolve(null)
    img.src = src
  })
}

async function loadFonts() {
  if (!document.fonts) return
  try {
    await Promise.all([
      document.fonts.load('600 40px Cinzel'),
      document.fonts.load('500 40px Cinzel'),
      document.fonts.load('400 20px Montserrat'),
      document.fonts.load('600 20px Montserrat'),
    ])
  } catch {
    /* fall back to system fonts */
  }
}

function roundRect(ctx: Ctx, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

function goldGradient(ctx: Ctx, x0: number, x1: number) {
  const g = ctx.createLinearGradient(x0, 0, x1, 0)
  g.addColorStop(0, GOLD_DARK)
  g.addColorStop(0.35, GOLD_LIGHT)
  g.addColorStop(0.7, GOLD)
  g.addColorStop(1, GOLD_LIGHT)
  return g
}

function blackGradient(ctx: Ctx, y0: number, y1: number) {
  const g = ctx.createLinearGradient(0, y0, 0, y1)
  g.addColorStop(0, '#1a1610')
  g.addColorStop(1, '#050505')
  return g
}

function spaced(ctx: Ctx, text: string, x: number, y: number, spacing: number, align: 'left' | 'center' = 'left') {
  const chars = [...text]
  const widths = chars.map((c) => ctx.measureText(c).width + spacing)
  const total = widths.reduce((a, b) => a + b, 0) - spacing
  let cx = align === 'center' ? x - total / 2 : x
  chars.forEach((c, i) => {
    ctx.fillText(c, cx, y)
    cx += widths[i]
  })
  return total
}

function fit(ctx: Ctx, text: string, maxWidth: number) {
  if (ctx.measureText(text).width <= maxWidth) return text
  let t = text
  while (t.length > 1 && ctx.measureText(`${t}…`).width > maxWidth) t = t.slice(0, -1)
  return `${t}…`
}

type Icon = 'house' | 'calendar' | 'pin' | 'user' | 'doc' | 'pen' | 'card'

function drawIcon(ctx: Ctx, icon: Icon, cx: number, cy: number, s: number, color: string) {
  ctx.save()
  ctx.translate(cx, cy)
  ctx.scale(s, s)
  ctx.strokeStyle = color
  ctx.fillStyle = color
  ctx.lineWidth = 2.4
  ctx.lineJoin = 'round'
  ctx.lineCap = 'round'
  ctx.beginPath()
  if (icon === 'house') {
    ctx.moveTo(-15, 1)
    ctx.lineTo(0, -14)
    ctx.lineTo(15, 1)
    ctx.moveTo(-11, -2)
    ctx.lineTo(-11, 15)
    ctx.lineTo(11, 15)
    ctx.lineTo(11, -2)
    ctx.moveTo(-3.5, 15)
    ctx.lineTo(-3.5, 6)
    ctx.lineTo(3.5, 6)
    ctx.lineTo(3.5, 15)
    ctx.stroke()
  } else if (icon === 'calendar') {
    roundRect(ctx, -12, -10, 24, 23, 4)
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(-12, -2)
    ctx.lineTo(12, -2)
    ctx.moveTo(-6, -14)
    ctx.lineTo(-6, -8)
    ctx.moveTo(6, -14)
    ctx.lineTo(6, -8)
    ctx.stroke()
    ;[[-6, 4], [0, 4], [6, 4], [-6, 9], [0, 9]].forEach(([x, y]) => {
      ctx.beginPath()
      ctx.arc(x, y, 1.3, 0, Math.PI * 2)
      ctx.fill()
    })
  } else if (icon === 'pin') {
    ctx.moveTo(0, 16)
    ctx.bezierCurveTo(-14, 2, -11, -14, 0, -14)
    ctx.bezierCurveTo(11, -14, 14, 2, 0, 16)
    ctx.stroke()
    ctx.beginPath()
    ctx.arc(0, -4, 4.5, 0, Math.PI * 2)
    ctx.fill()
  } else if (icon === 'user') {
    ctx.arc(0, -6, 7.5, 0, Math.PI * 2)
    ctx.fill()
    ctx.beginPath()
    ctx.moveTo(-13, 15)
    ctx.bezierCurveTo(-13, 1, 13, 1, 13, 15)
    ctx.closePath()
    ctx.fill()
  } else if (icon === 'doc') {
    roundRect(ctx, -10, -15, 20, 30, 3)
    ctx.stroke()
    ctx.beginPath()
    ;[-7, -1, 5].forEach((y) => {
      ctx.moveTo(-5, y)
      ctx.lineTo(5, y)
    })
    ctx.stroke()
  } else if (icon === 'pen') {
    ctx.lineWidth = 4
    ctx.moveTo(-11, 12)
    ctx.lineTo(9, -8)
    ctx.stroke()
    ctx.beginPath()
    ctx.lineWidth = 2.4
    ctx.moveTo(-13, 14)
    ctx.lineTo(-9, 8)
    ctx.moveTo(-13, 14)
    ctx.lineTo(-7, 12)
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(11, -10)
    ctx.lineTo(13, -12)
    ctx.stroke()
  } else if (icon === 'card') {
    roundRect(ctx, -14, -9, 28, 18, 3)
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(-14, -3)
    ctx.lineTo(14, -3)
    ctx.stroke()
    ctx.fillRect(-10, 3, 8, 3)
  }
  ctx.restore()
}

function badge(ctx: Ctx, icon: Icon, cx: number, cy: number, r: number) {
  ctx.save()
  ctx.beginPath()
  ctx.arc(cx, cy, r, 0, Math.PI * 2)
  ctx.fillStyle = '#0a0907'
  ctx.shadowColor = 'rgba(0,0,0,0.3)'
  ctx.shadowBlur = 8
  ctx.fill()
  ctx.shadowBlur = 0
  ctx.lineWidth = 4
  ctx.strokeStyle = goldGradient(ctx, cx - r, cx + r)
  ctx.stroke()
  ctx.restore()
  drawIcon(ctx, icon, cx, cy, r / 30, GOLD_LIGHT)
}

function titlePill(ctx: Ctx, x: number, y: number, w: number, label: string) {
  ctx.save()
  roundRect(ctx, x, y, w, 56, 28)
  ctx.fillStyle = blackGradient(ctx, y, y + 56)
  ctx.fill()
  ctx.strokeStyle = 'rgba(212,175,106,0.55)'
  ctx.lineWidth = 1.5
  ctx.stroke()
  ctx.font = '600 26px Cinzel, Georgia, serif'
  ctx.fillStyle = CREAM
  ctx.textBaseline = 'middle'
  spaced(ctx, label, x + 52, y + 29, 3)
  ctx.restore()
}

function box(ctx: Ctx, x: number, y: number, w: number, h: number) {
  ctx.save()
  roundRect(ctx, x, y, w, h, 24)
  ctx.fillStyle = 'rgba(255,255,255,0.42)'
  ctx.fill()
  ctx.lineWidth = 2.2
  ctx.strokeStyle = LINE
  ctx.stroke()
  ctx.restore()
}

function hairline(ctx: Ctx, x0: number, x1: number, y: number) {
  ctx.save()
  ctx.strokeStyle = 'rgba(184,137,59,0.55)'
  ctx.lineWidth = 1.6
  ctx.beginPath()
  ctx.moveTo(x0, y)
  ctx.lineTo(x1, y)
  ctx.stroke()
  ctx.restore()
}

export type InvoiceData = {
  code: string
  matricule: string
  property: string
  city: string
  rooms: string
  checkIn: string
  checkOut: string
  nights: number
  guests: number
  base: number
  discount: number
  total: number
  paymentStatus: string
  clientName: string
  clientPhone: string
  clientCni: string
  issued: string
}

export function invoiceData(reservation: Reservation, matricule: string): InvoiceData {
  const property = reservation.properties
  const profile = reservation.profiles
  const pay = reservation.payments?.[0]
  const bedrooms = property?.bedrooms ?? 1
  const capacity = property?.capacity ?? reservation.guest_count
  const nights = Math.max(1, reservation.nights)
  return {
    code: reservation.public_code,
    matricule,
    property: property?.name ?? '',
    city: property?.city || 'Douala',
    rooms: `${bedrooms} chambre${bedrooms > 1 ? 's' : ''} · ${capacity} voyageur${capacity > 1 ? 's' : ''} max`,
    checkIn: formatDate(reservation.check_in),
    checkOut: formatDate(reservation.check_out),
    nights,
    guests: reservation.guest_count ?? 1,
    base: reservation.base_amount_xaf,
    discount: reservation.discount_xaf,
    total: reservation.total_amount_xaf,
    paymentStatus: (pay && PAYMENT_LABEL[pay.status]) || RESERVATION_LABEL[reservation.status] || reservation.status,
    clientName: profile?.full_name || profile?.email || '—',
    clientPhone: profile?.phone || '—',
    clientCni: profile?.cni || '—',
    issued: formatDate(new Date().toISOString().slice(0, 10)),
  }
}

export async function renderInvoice(data: InvoiceData): Promise<HTMLCanvasElement> {
  const base = import.meta.env.BASE_URL
  const [mono, hero] = await Promise.all([loadImage(`${base}brand/imperial-monogram.png`), loadImage(`${base}hero-accueil.jpg`), loadFonts()]).then(
    ([a, b]) => [a, b] as const,
  )
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(W * SCALE)
  canvas.height = Math.round(H * SCALE)
  const ctx = canvas.getContext('2d')!
  ctx.scale(SCALE, SCALE)
  ctx.textBaseline = 'alphabetic'

  const paper = ctx.createLinearGradient(0, 0, 0, H)
  paper.addColorStop(0, '#fbf5e6')
  paper.addColorStop(1, '#f2e8cf')
  ctx.fillStyle = paper
  ctx.fillRect(0, 0, W, H)

  // header
  const headerPath = () => {
    ctx.beginPath()
    ctx.moveTo(0, 0)
    ctx.lineTo(W, 0)
    ctx.lineTo(W, 282)
    ctx.bezierCurveTo(800, 244, 650, 286, 480, 280)
    ctx.bezierCurveTo(320, 274, 170, 238, 0, 266)
    ctx.closePath()
  }
  ctx.save()
  headerPath()
  ctx.clip()
  const hg = ctx.createLinearGradient(0, 0, 0, 300)
  hg.addColorStop(0, '#060606')
  hg.addColorStop(1, '#15110a')
  ctx.fillStyle = hg
  ctx.fillRect(0, 0, W, 300)
  if (hero) {
    const bw = 560
    const bh = 300
    const scale = Math.max(bw / hero.width, bh / hero.height)
    const sw = bw / scale
    const sh = bh / scale
    ctx.drawImage(hero, (hero.width - sw) / 2, (hero.height - sh) * 0.55, sw, sh, W - bw, 0, bw, bh)
    const fade = ctx.createLinearGradient(W - bw, 0, W, 0)
    fade.addColorStop(0, 'rgba(8,7,5,1)')
    fade.addColorStop(0.45, 'rgba(8,7,5,0.6)')
    fade.addColorStop(1, 'rgba(8,7,5,0.12)')
    ctx.fillStyle = fade
    ctx.fillRect(W - bw, 0, bw, bh)
  }
  ctx.restore()
  ctx.save()
  ctx.lineWidth = 5
  ctx.strokeStyle = goldGradient(ctx, 0, W)
  ctx.beginPath()
  ctx.moveTo(W, 282)
  ctx.bezierCurveTo(800, 244, 650, 286, 480, 280)
  ctx.bezierCurveTo(320, 274, 170, 238, 0, 266)
  ctx.stroke()
  ctx.globalAlpha = 0.55
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(W, 296)
  ctx.bezierCurveTo(800, 258, 650, 300, 480, 294)
  ctx.bezierCurveTo(320, 288, 170, 252, 0, 280)
  ctx.stroke()
  ctx.restore()

  if (mono) {
    const mh = 128
    const mw = (mono.width / mono.height) * mh
    ctx.drawImage(mono, 62, 26, mw, mh)
  }
  ctx.fillStyle = goldGradient(ctx, 44, 340)
  ctx.font = '600 33px Cinzel, Georgia, serif'
  spaced(ctx, 'IMPÉRIAL HOME', 46, 190, 5)
  ctx.strokeStyle = goldGradient(ctx, 44, 340)
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(46, 206)
  ctx.lineTo(340, 206)
  ctx.stroke()
  ctx.font = '500 13.5px Montserrat, system-ui, sans-serif'
  ctx.fillStyle = GOLD_LIGHT
  spaced(ctx, 'L’ART DU SOIN, L’ESPRIT DU DÉTAIL.', 46, 232, 2)

  ctx.strokeStyle = 'rgba(212,175,106,0.75)'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(384, 66)
  ctx.lineTo(384, 196)
  ctx.stroke()
  ctx.fillStyle = goldGradient(ctx, 420, 700)
  ctx.font = '600 76px Cinzel, Georgia, serif'
  ctx.fillText('FACTURE', 418, 130)
  ctx.fillStyle = CREAM
  ctx.font = '500 56px Cinzel, Georgia, serif'
  ctx.fillText('DE LOCATION', 418, 194)
  ctx.font = '400 21px Montserrat, system-ui, sans-serif'
  ctx.fillStyle = CREAM
  ctx.fillText('Un espace, votre confort,', 420, 232)
  ctx.fillText('notre priorité.', 420, 260)

  // left box
  box(ctx, 24, 336, 470, 384)
  badge(ctx, 'house', 82, 346, 40)
  titlePill(ctx, 100, 318, 372, 'IMPÉRIAL HOME')
  ctx.fillStyle = INK
  ctx.textBaseline = 'middle'
  ctx.font = '400 22px Montserrat, system-ui, sans-serif'
  ctx.fillText('Résidences meublées · Douala', 50, 428)
  const rows: [Icon, string][] = [
    ['pin', data.city],
    ['calendar', `${data.checkIn} — ${data.checkOut} · ${data.nights} nuit${data.nights > 1 ? 's' : ''}`],
    ['user', `${data.guests} voyageur${data.guests > 1 ? 's' : ''}`],
  ]
  rows.forEach(([icon, text], i) => {
    const y = 482 + i * 52
    drawIcon(ctx, icon, 66, y, 0.85, GOLD_DARK)
    ctx.fillStyle = INK
    ctx.font = '400 21px Montserrat, system-ui, sans-serif'
    ctx.fillText(fit(ctx, text, 380), 98, y)
  })
  hairline(ctx, 48, 470, 622)
  ctx.fillStyle = INK
  ctx.font = '600 23px Montserrat, system-ui, sans-serif'
  ctx.fillText('Appartement', 50, 646)
  ctx.font = '400 19px Montserrat, system-ui, sans-serif'
  ctx.fillText(fit(ctx, `${data.property} — ${data.rooms}`, 424), 50, 675)
  ctx.fillStyle = GOLD_DARK
  ctx.font = '600 21px Montserrat, system-ui, sans-serif'
  ctx.fillText(`Matricule : ${data.matricule}`, 50, 703)

  // right box
  box(ctx, 512, 336, 464, 384)
  badge(ctx, 'doc', 570, 346, 40)
  titlePill(ctx, 588, 318, 366, 'FACTURE')
  ctx.save()
  roundRect(ctx, 790, 326, 156, 40, 20)
  ctx.fillStyle = goldGradient(ctx, 790, 946)
  ctx.fill()
  ctx.fillStyle = '#17110a'
  ctx.font = '700 18px Montserrat, system-ui, sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText(fit(ctx, data.code, 140), 868, 347)
  ctx.restore()
  ctx.textBaseline = 'middle'
  ctx.fillStyle = INK
  ctx.font = '600 21px Montserrat, system-ui, sans-serif'
  ctx.fillText('Date d’émission :', 536, 428)
  ctx.fillText('Séjour :', 536, 476)
  ctx.font = '400 21px Montserrat, system-ui, sans-serif'
  ctx.fillText(data.issued, 744, 428)
  ctx.fillText(fit(ctx, `${data.checkIn} — ${data.checkOut}`, 320), 630, 476)
  hairline(ctx, 536, 950, 516)
  ctx.save()
  roundRect(ctx, 530, 540, 420, 66, 33)
  ctx.fillStyle = '#0a0907'
  ctx.fill()
  roundRect(ctx, 530, 540, 176, 66, 33)
  ctx.fillStyle = goldGradient(ctx, 530, 706)
  ctx.fill()
  ctx.fillStyle = CREAM
  ctx.font = '600 20px Montserrat, system-ui, sans-serif'
  ctx.fillText('Montant total', 552, 574)
  ctx.textAlign = 'right'
  ctx.fillStyle = '#ffffff'
  ctx.font = '700 28px Montserrat, system-ui, sans-serif'
  ctx.fillText(fit(ctx, formatXaf(data.total), 215), 932, 574)
  ctx.restore()
  ctx.textBaseline = 'middle'
  ctx.fillStyle = MUTED
  ctx.font = '400 21px Montserrat, system-ui, sans-serif'
  ctx.fillText('Réduction', 536, 640)
  ctx.fillText('Statut du paiement', 536, 686)
  ctx.fillStyle = INK
  ctx.fillText(formatXaf(data.discount), 780, 640)
  ctx.beginPath()
  ctx.arc(780, 686, 15, 0, Math.PI * 2)
  ctx.fillStyle = goldGradient(ctx, 765, 795)
  ctx.fill()
  ctx.strokeStyle = '#fff'
  ctx.lineWidth = 3.2
  ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.moveTo(773, 686)
  ctx.lineTo(778, 692)
  ctx.lineTo(788, 680)
  ctx.stroke()
  ctx.fillStyle = GOLD_DARK
  ctx.font = '600 22px Montserrat, system-ui, sans-serif'
  ctx.fillText(data.paymentStatus, 806, 686)

  // table
  const tableY = 752
  const lines = [
    {
      title: 'Location de l’appartement',
      sub: `${data.nights} nuit${data.nights > 1 ? 's' : ''} (${data.checkIn} — ${data.checkOut})`,
      qty: String(data.nights),
      unit: formatXaf(Math.round(data.base / data.nights)),
      amount: formatXaf(data.base),
    },
    ...(data.discount > 0
      ? [{ title: 'Réduction', sub: 'Code promotionnel', qty: '1', unit: `-${formatXaf(data.discount)}`, amount: `-${formatXaf(data.discount)}` }]
      : []),
  ]
  const rowH = 84
  const tableH = 226 + lines.length * rowH
  box(ctx, 24, tableY, 952, tableH)
  ctx.save()
  roundRect(ctx, 24, tableY, 952, 56, 24)
  ctx.fillStyle = blackGradient(ctx, tableY, tableY + 56)
  ctx.fill()
  ctx.restore()
  const cols = [440, 600, 790]
  ctx.textBaseline = 'middle'
  ctx.fillStyle = GOLD_LIGHT
  ctx.font = '600 19px Montserrat, system-ui, sans-serif'
  spaced(ctx, 'DÉSIGNATION', 50, tableY + 29, 1.5)
  spaced(ctx, 'QUANTITÉ', (cols[0] + cols[1]) / 2, tableY + 29, 1.5, 'center')
  spaced(ctx, 'PRIX UNITAIRE', (cols[1] + cols[2]) / 2, tableY + 29, 1.5, 'center')
  spaced(ctx, 'MONTANT', (cols[2] + 976) / 2, tableY + 29, 1.5, 'center')
  ctx.strokeStyle = 'rgba(212,175,106,0.5)'
  ctx.lineWidth = 1.4
  cols.forEach((cx) => {
    ctx.beginPath()
    ctx.moveTo(cx, tableY + 10)
    ctx.lineTo(cx, tableY + 46)
    ctx.stroke()
  })
  lines.forEach((line, i) => {
    const y0 = tableY + 56 + i * rowH
    cols.forEach((cx) => {
      ctx.strokeStyle = 'rgba(184,137,59,0.45)'
      ctx.beginPath()
      ctx.moveTo(cx, y0)
      ctx.lineTo(cx, y0 + rowH)
      ctx.stroke()
    })
    hairline(ctx, 24, 976, y0 + rowH)
    badge(ctx, i === 0 ? 'house' : 'card', 80, y0 + rowH / 2, 26)
    ctx.fillStyle = INK
    ctx.font = '600 22px Montserrat, system-ui, sans-serif'
    ctx.fillText(fit(ctx, line.title, 330), 124, y0 + rowH / 2 - 12)
    ctx.fillStyle = MUTED
    ctx.font = '400 17px Montserrat, system-ui, sans-serif'
    ctx.fillText(fit(ctx, line.sub, 310), 124, y0 + rowH / 2 + 15)
    ctx.fillStyle = INK
    ctx.font = '400 20px Montserrat, system-ui, sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText(line.qty, (cols[0] + cols[1]) / 2, y0 + rowH / 2)
    ctx.fillText(fit(ctx, line.unit, 170), (cols[1] + cols[2]) / 2, y0 + rowH / 2)
    ctx.fillText(fit(ctx, line.amount, 170), (cols[2] + 976) / 2, y0 + rowH / 2)
    ctx.textAlign = 'left'
  })
  const totalY = tableY + 56 + lines.length * rowH + 16
  ctx.save()
  roundRect(ctx, 500, totalY, 460, 66, 14)
  ctx.fillStyle = '#0a0907'
  ctx.fill()
  roundRect(ctx, 500, totalY, 170, 66, 14)
  ctx.fillStyle = goldGradient(ctx, 500, 670)
  ctx.fill()
  ctx.fillStyle = CREAM
  ctx.font = '600 24px Montserrat, system-ui, sans-serif'
  ctx.textBaseline = 'middle'
  spaced(ctx, 'TOTAL', 530, totalY + 34, 2)
  ctx.textAlign = 'right'
  ctx.fillStyle = GOLD_LIGHT
  ctx.font = '700 30px Montserrat, system-ui, sans-serif'
  ctx.fillText(fit(ctx, formatXaf(data.total), 260), 942, totalY + 34)
  ctx.restore()
  const payY = totalY + 86
  ctx.save()
  roundRect(ctx, 44, payY, 912, 54, 14)
  ctx.fillStyle = 'rgba(80,60,30,0.1)'
  ctx.fill()
  ctx.restore()
  drawIcon(ctx, 'card', 78, payY + 27, 0.85, GOLD_DARK)
  ctx.textBaseline = 'middle'
  ctx.fillStyle = INK
  ctx.font = '500 20px Montserrat, system-ui, sans-serif'
  ctx.fillText(`Paiement : ${data.paymentStatus.toLowerCase()}`, 108, payY + 28)
  ctx.fillStyle = MUTED
  ctx.font = '400 15px Montserrat, system-ui, sans-serif'
  ctx.textAlign = 'right'
  ctx.fillText('Règlement en francs CFA (XAF)', 940, payY + 28)
  ctx.textAlign = 'left'

  // client + signature
  const by = tableY + tableH + 40
  const bh = 205
  box(ctx, 24, by, 470, bh)
  badge(ctx, 'user', 82, by + 10, 40)
  titlePill(ctx, 100, by - 18, 250, 'CLIENT')
  ctx.textBaseline = 'middle'
  const info: [string, string][] = [
    ['Nom :', data.clientName],
    ['Téléphone :', data.clientPhone],
    ['N° CNI :', data.clientCni],
  ]
  info.forEach(([label, value], i) => {
    const y = by + 62 + i * 34
    ctx.fillStyle = INK
    ctx.font = '600 20px Montserrat, system-ui, sans-serif'
    ctx.fillText(label, 50, y)
    ctx.font = '500 20px Montserrat, system-ui, sans-serif'
    ctx.fillText(fit(ctx, value, 270), 200, y)
  })
  hairline(ctx, 48, 470, by + 144)
  ctx.fillStyle = GOLD
  ctx.font = 'italic 500 30px "Cormorant Garamond", Georgia, serif'
  ctx.fillText('Merci pour votre confiance !', 52, by + 176)

  box(ctx, 512, by, 464, bh)
  badge(ctx, 'pen', 570, by + 10, 40)
  titlePill(ctx, 588, by - 18, 300, 'SIGNATURE')
  ctx.textAlign = 'center'
  ctx.fillStyle = INK
  ctx.font = '600 22px Montserrat, system-ui, sans-serif'
  ctx.fillText('Impérial Home', 744, by + 62)
  if (mono) {
    const mh = 54
    const mw = (mono.width / mono.height) * mh
    ctx.drawImage(mono, 744 - mw / 2, by + 76, mw, mh)
  }
  hairline(ctx, 540, 948, by + 144)
  ctx.font = '400 20px Montserrat, system-ui, sans-serif'
  ctx.fillText(`Douala, le ${data.issued}`, 744, by + 174)
  ctx.textAlign = 'left'

  return canvas
}

export async function downloadInvoice(reservation: Reservation, matricule = '') {
  const data = invoiceData(reservation, matricule)
  const canvas = await renderInvoice(data)
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  doc.addImage(canvas.toDataURL('image/jpeg', 0.92), 'JPEG', 0, 0, 210, 297)
  doc.save(`${reservation.public_code}.pdf`)
}
