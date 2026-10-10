import type { Reservation } from '../types/database'
import { fetchPropertyIndex, propertyMatricule } from './matricule'
import { rentalVehicleName, type VehicleRental } from './vehicles'

export const STATUS_LABEL: Record<string, string> = {
  pending: 'En attente',
  payment_processing: 'Paiement en cours',
  confirmed: 'Confirmée',
  cancelled: 'Annulée',
  expired: 'Expirée',
  completed: 'Terminée',
  requested: 'Demandée',
}

export const STATUS_COLOR: Record<string, { bg: string; fg: string }> = {
  confirmed: { bg: 'DDF3E4', fg: '1E6B3A' },
  completed: { bg: 'E3ECF8', fg: '234A80' },
  pending: { bg: 'FFF0CC', fg: '8A5A00' },
  requested: { bg: 'FFF0CC', fg: '8A5A00' },
  payment_processing: { bg: 'FFF0CC', fg: '8A5A00' },
  cancelled: { bg: 'FADBD8', fg: '9B2218' },
  expired: { bg: 'EDEAE4', fg: '6B6358' },
}

export type Column = { header: string; width: number; align?: 'left' | 'center' | 'right'; money?: boolean; status?: boolean }
export type SheetSpec = {
  name: string
  title: string
  noun: string
  columns: Column[]
  rows: (string | number)[][]
  statusColumn: number
  totalColumn: number
}

export type Report = {
  sheets: SheetSpec[]
  summary: { label: string; count: number; total: number; active: number }[]
  grandTotal: number
  grandActive: number
  grandCount: number
}

export function dateFr(iso: string | null | undefined) {
  if (!iso) return ''
  const [y, m, d] = iso.slice(0, 10).split('-')
  return `${d}/${m}/${y}`
}

const isInactive = (status: unknown) => status === 'cancelled' || status === 'expired'

export function sheetTotals(spec: SheetSpec) {
  const total = spec.rows.reduce((sum, r) => sum + Number(r[spec.totalColumn] ?? 0), 0)
  const active = spec.rows.filter((r) => !isInactive(r[spec.statusColumn])).reduce((sum, r) => sum + Number(r[spec.totalColumn] ?? 0), 0)
  return { total, active }
}

export async function buildReport(stays: Reservation[], rentals: VehicleRental[]): Promise<Report> {
  const index = await fetchPropertyIndex()
  const staySheet: SheetSpec = {
    name: 'Appartements',
    title: 'Réservations d’appartements',
    noun: 'réservation',
    columns: [
      { header: 'Code', width: 18 },
      { header: 'Matricule', width: 14, align: 'center' },
      { header: 'Appartement', width: 28 },
      { header: 'Client', width: 28 },
      { header: 'Arrivée', width: 14, align: 'center' },
      { header: 'Départ', width: 14, align: 'center' },
      { header: 'Nuits', width: 9, align: 'center' },
      { header: 'Statut', width: 20, align: 'center', status: true },
      { header: 'Total', width: 22, align: 'right', money: true },
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
    noun: 'location',
    columns: [
      { header: 'Code', width: 18 },
      { header: 'Véhicule', width: 28 },
      { header: 'Début', width: 14, align: 'center' },
      { header: 'Fin', width: 14, align: 'center' },
      { header: 'Jours', width: 9, align: 'center' },
      { header: 'Chauffeur', width: 14, align: 'center' },
      { header: 'Statut', width: 20, align: 'center', status: true },
      { header: 'Total', width: 22, align: 'right', money: true },
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
  const sheets = [staySheet, carSheet]
  const summary = sheets.map((sheet) => ({ label: sheet.name, count: sheet.rows.length, ...sheetTotals(sheet) }))
  return {
    sheets,
    summary,
    grandTotal: summary.reduce((a, b) => a + b.total, 0),
    grandActive: summary.reduce((a, b) => a + b.active, 0),
    grandCount: summary.reduce((a, b) => a + b.count, 0),
  }
}

export const todayLong = () => new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })
