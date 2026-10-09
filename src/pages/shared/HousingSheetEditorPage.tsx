import { useEffect, useRef, useState } from 'react'
import { Helmet } from 'react-helmet-async'
import { Link, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { HousingSheet } from '../../components/housing/HousingSheet'
import { fetchReservation } from '../../lib/data'
import {
  demoHousingSheet,
  emptyHousingSheet,
  housingSheetToRow,
  rowToHousingSheet,
  type HousingSheetData,
} from '../../lib/housingSheet'
import { downloadElementAsA4Pdf } from '../../lib/pdfCapture'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { useSiteConfig } from '../../hooks/useSite'
import { WhatsAppFab } from '../../components/layout/WhatsAppFab'
import { cn } from '../../lib/cn'

const storageKey = (id: string) => `ih-housing-sheet-${id}`
const tool =
  'flex min-h-9 items-center justify-center border-t border-r border-[#d4af6a]/20 px-2 text-center text-xs tracking-[0.06em] uppercase disabled:opacity-50'

export function HousingSheetEditorPage({
  role: initialRole,
  preview = false,
}: {
  role: 'guest' | 'admin'
  preview?: boolean
}) {
  const { id } = useParams()
  const reservationId = preview ? 'preview' : (id ?? 'template')
  const { profile } = useAuth()
  const { data: config } = useSiteConfig()
  const sheetRef = useRef<HTMLDivElement>(null)
  const [role, setRole] = useState<'guest' | 'admin'>(initialRole)
  const [data, setData] = useState<HousingSheetData>(() => (preview ? demoHousingSheet() : emptyHousingSheet()))
  const [saved, setSaved] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const needsReservation = !preview && reservationId !== 'template'
  const { data: reservation, isFetched } = useQuery({
    queryKey: ['reservation', reservationId],
    queryFn: () => fetchReservation(reservationId),
    enabled: needsReservation,
  })

  useEffect(() => {
    let cancelled = false
    async function load() {
      if (preview) {
        if (!cancelled) setData(demoHousingSheet())
        return
      }
      if (needsReservation && !isFetched) return
      const confirmed = reservation?.status === 'confirmed' || reservation?.status === 'completed'
      const revealWifi = initialRole === 'admin' || confirmed
      let sheet = emptyHousingSheet()
      if (supabase && reservationId !== 'template') {
        const { data: row } = await supabase.from('housing_sheets').select('*').eq('reservation_id', reservationId).maybeSingle()
        if (row) sheet = rowToHousingSheet(row as Record<string, string | null>)
      }
      if (!sheet.guest_name) {
        const local = localStorage.getItem(storageKey(reservationId))
        if (local) sheet = { ...sheet, ...JSON.parse(local) }
      }
      if (reservation) {
        sheet = {
          ...sheet,
          guest_name: sheet.guest_name || reservation.profiles?.full_name || profile?.full_name || '',
          guest_phone: sheet.guest_phone || reservation.profiles?.phone || profile?.phone || '',
          guest_cni: sheet.guest_cni || reservation.profiles?.cni || profile?.cni || '',
          arrival_date: sheet.arrival_date || reservation.check_in,
          departure_date: sheet.departure_date || reservation.check_out,
          arrival_time: sheet.arrival_time || reservation.properties?.check_in_time?.slice(0, 5) || '14:00',
          departure_time: sheet.departure_time || reservation.properties?.check_out_time?.slice(0, 5) || '11:00',
          reception_phone: (config?.whatsapp || '237674092263').replace(/^237/, ''),
          guest_sign_name: sheet.guest_sign_name || reservation.profiles?.full_name || profile?.full_name || '',
        }
      }
      if (!revealWifi) {
        sheet = { ...sheet, wifi_name: '', wifi_password: '' }
      } else if (!sheet.wifi_password && supabase && reservation?.property_id) {
        const { data: secrets } = await supabase
          .from('property_welcome_secrets')
          .select('wifi_name, wifi_password')
          .eq('property_id', reservation.property_id)
          .maybeSingle()
        sheet = {
          ...sheet,
          wifi_name: sheet.wifi_name || secrets?.wifi_name || '',
          wifi_password: secrets?.wifi_password || '',
        }
      }
      if (!cancelled) setData(sheet)
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [reservation, reservationId, profile, config, preview, isFetched, needsReservation, initialRole])

  async function save() {
    setError(null)
    localStorage.setItem(storageKey(reservationId), JSON.stringify(data))
    if (supabase && !preview && reservationId !== 'template') {
      const { error: upsertError } = await supabase
        .from('housing_sheets')
        .upsert(housingSheetToRow(data, reservationId, role), { onConflict: 'reservation_id' })
      if (upsertError) {
        setError(upsertError.message)
        return
      }
      localStorage.removeItem(storageKey(reservationId))
    }
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  async function downloadPdf() {
    const target = sheetRef.current?.querySelector('.housing-a4') as HTMLElement | null
    if (!target) return
    setBusy(true)
    setError(null)
    target.classList.add('housing-export')
    try {
      await save()
      await new Promise((resolve) => requestAnimationFrame(() => resolve(undefined)))
      await downloadElementAsA4Pdf(target, `Imperial-Home-Fiche-${reservation?.public_code ?? 'logement'}.pdf`)
    } catch {
      setError('Le PDF n’a pas pu être généré. Utilisez Imprimer, puis « Enregistrer au format PDF ».')
    } finally {
      target.classList.remove('housing-export')
      setBusy(false)
    }
  }

  const backTo = preview
    ? '/'
    : role === 'admin'
      ? reservationId === 'template'
        ? '/admin'
        : `/admin/reservations/${reservationId}`
      : `/account/reservations/${reservationId}`

  return (
    <div className="fiche-page theme-page min-h-svh pb-16">
      <Helmet>
        <title>Fiche de logement | Impérial Home</title>
      </Helmet>
      <div className="fiche-toolbar sticky top-0 z-20 border-b border-[#d4af6a]/30 bg-white text-[#8b6f32]">
        <div className="flex items-center justify-between gap-3 px-3 py-2">
          <p className="text-sm font-semibold tracking-[0.08em] uppercase">Fiche de logement</p>
          <Link to={backTo} className="shrink-0 text-xs tracking-[0.12em] uppercase">
            Retour
          </Link>
        </div>
        <div className="grid grid-cols-2 border-t border-[#d4af6a]/25">
          {preview ? (
            <>
              <button type="button" className={cn(tool, role === 'guest' && 'bg-[#c4a35a] text-black')} onClick={() => setRole('guest')}>
                Client
              </button>
              <button type="button" className={cn(tool, role === 'admin' && 'bg-[#c4a35a] text-black')} onClick={() => setRole('admin')}>
                Réception
              </button>
              <button type="button" className={tool} onClick={() => setData(demoHousingSheet())}>
                Exemple
              </button>
              <button type="button" className={tool} onClick={() => setData(emptyHousingSheet())}>
                Vierge
              </button>
            </>
          ) : null}
          <button type="button" className={tool} onClick={() => void save()}>
            Enregistrer
          </button>
          <button type="button" className={tool} disabled={busy} onClick={() => void downloadPdf()}>
            {busy ? 'Préparation…' : 'PDF'}
          </button>
          <button type="button" className={cn(tool, 'col-span-2')} onClick={() => window.print()}>
            Imprimer
          </button>
        </div>
      </div>
      {saved ? <p className="py-2 text-center text-sm tracking-wider text-[#d4af6a] uppercase">Enregistré</p> : null}
      {error ? <p className="px-4 py-2 text-center text-sm text-red-300">{error}</p> : null}
      <div className="housing-print-wrap mx-auto w-full max-w-[210mm] px-3 py-4">
        <div ref={sheetRef} className="housing-print-target">
          <HousingSheet data={data} onChange={setData} role={role} />
        </div>
      </div>
      <WhatsAppFab />
    </div>
  )
}
