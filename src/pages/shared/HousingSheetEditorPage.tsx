import { useEffect, useRef, useState } from 'react'
import { Helmet } from 'react-helmet-async'
import { Link, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { HousingSheet } from '../../components/housing/HousingSheet'
import { Button } from '../../components/ui/Button'
import { fetchReservation } from '../../lib/data'
import {
  demoHousingSheet,
  emptyHousingSheet,
  housingSheetToRow,
  rowToHousingSheet,
  type HousingSheetData,
} from '../../lib/housingSheet'
import { downloadElementAsA4Pdf } from '../../lib/pdfCapture'
import { supabase, isSupabaseConfigured } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { useSiteConfig } from '../../hooks/useSite'
import { WhatsAppFab } from '../../components/layout/WhatsAppFab'
import { cn } from '../../lib/cn'

const storageKey = (id: string) => `ih-housing-sheet-${id}`

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

  const { data: reservation } = useQuery({
    queryKey: ['reservation', reservationId],
    queryFn: () => fetchReservation(reservationId),
    enabled: !preview && reservationId !== 'template',
  })

  useEffect(() => {
    let cancelled = false
    async function load() {
      if (preview) {
        if (!cancelled) setData(demoHousingSheet())
        return
      }
      if (supabase && reservationId !== 'template') {
        const { data: row } = await supabase.from('housing_sheets').select('*').eq('reservation_id', reservationId).maybeSingle()
        if (row && !cancelled) {
          setData(rowToHousingSheet(row as Record<string, string | null>))
          return
        }
      }
      const local = localStorage.getItem(storageKey(reservationId))
      if (local && !cancelled) {
        setData({ ...emptyHousingSheet(), ...JSON.parse(local) })
        return
      }
      if (reservation && !local) {
        let wifiName = ''
        let wifiPassword = ''
        if (supabase && reservation.property_id) {
          const { data: secrets } = await supabase
            .from('property_welcome_secrets')
            .select('wifi_name, wifi_password')
            .eq('property_id', reservation.property_id)
            .maybeSingle()
          wifiName = secrets?.wifi_name ?? ''
          wifiPassword = secrets?.wifi_password ?? ''
        }
        if (!cancelled) {
          setData((prev) => ({
            ...prev,
            guest_name: reservation.profiles?.full_name || profile?.full_name || prev.guest_name,
            guest_phone: reservation.profiles?.phone || profile?.phone || prev.guest_phone,
            guest_cni: reservation.profiles?.cni || profile?.cni || prev.guest_cni,
            arrival_date: reservation.check_in,
            departure_date: reservation.check_out,
            arrival_time: reservation.properties?.check_in_time?.slice(0, 5) || '14:00',
            departure_time: reservation.properties?.check_out_time?.slice(0, 5) || '11:00',
            wifi_name: wifiName,
            wifi_password: wifiPassword,
            reception_phone: (config?.whatsapp || '237674092263').replace(/^237/, ''),
            guest_sign_name: reservation.profiles?.full_name || prev.guest_sign_name,
          }))
        }
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [reservation, reservationId, profile, config, preview])

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
    try {
      await save()
      await downloadElementAsA4Pdf(target, `Imperial-Home-Fiche-${reservation?.public_code ?? 'logement'}.pdf`)
    } catch {
      setError('Le PDF n’a pas pu être généré. Utilisez Imprimer, puis « Enregistrer au format PDF ».')
    } finally {
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
      <div className="fiche-toolbar sticky top-0 z-20 flex flex-wrap items-center justify-between gap-3 border-b border-[#d4af6a]/30 bg-white px-4 py-3 text-[#8b6f32]">
        <div>
          <p className="font-display tracking-[0.18em] uppercase">Fiche de logement</p>
          {preview ? (
            <p className="mt-1 text-[12px] tracking-[0.12em] text-[#d4af6a]/70 uppercase">Aperçu éditable · client et réception</p>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2">
          {preview ? (
            <div className="mr-2 flex overflow-hidden border border-[#d4af6a]/40">
              <button
                type="button"
                className={cn('px-3 py-2 text-[12px] tracking-[0.14em] uppercase', role === 'guest' ? 'bg-[#c4a35a] text-black' : '')}
                onClick={() => setRole('guest')}
              >
                Client
              </button>
              <button
                type="button"
                className={cn('px-3 py-2 text-[12px] tracking-[0.14em] uppercase', role === 'admin' ? 'bg-[#c4a35a] text-black' : '')}
                onClick={() => setRole('admin')}
              >
                Réception
              </button>
            </div>
          ) : null}
          {preview ? (
            <>
              <Button variant="ghost" onClick={() => setData(demoHousingSheet())}>
                Exemple
              </Button>
              <Button variant="ghost" onClick={() => setData(emptyHousingSheet())}>
                Vierge
              </Button>
            </>
          ) : null}
          <Button variant="ghost" onClick={() => void save()}>
            Enregistrer
          </Button>
          <Button onClick={() => void downloadPdf()} disabled={busy}>
            {busy ? 'Préparation…' : 'Télécharger PDF'}
          </Button>
          <Button variant="ghost" onClick={() => window.print()}>
            Imprimer
          </Button>
          <Link to={backTo} className="px-3 py-2 text-sm tracking-[0.14em] uppercase">
            Retour
          </Link>
        </div>
      </div>
      {saved ? <p className="py-2 text-center text-sm tracking-wider text-[#d4af6a] uppercase">Enregistré</p> : null}
      {error ? <p className="px-4 py-2 text-center text-sm text-red-300">{error}</p> : null}
      {!isSupabaseConfigured() || preview ? (
        <p className="px-4 py-2 text-center text-sm text-[#d4af6a]/80">
          {preview
            ? 'Aperçu public — remplissez la fiche, signez, enregistrez sur cet appareil, imprimez ou téléchargez le PDF.'
            : 'Mode aperçu — la fiche se sauvegarde sur cet appareil. Connectez Supabase pour la partager entre client et réception.'}
        </p>
      ) : null}
      <p className="px-4 text-center text-[13px] text-[#d4af6a]/70">
        {role === 'guest'
          ? 'Vous pouvez remplir vos informations et signer. Wi-Fi et cachet de la réception sont réservés à l’équipe.'
          : 'Mode réception — wifi, téléphone et signatures de l’établissement sont éditables.'}
      </p>
      <div className="housing-print-wrap mx-auto flex justify-center overflow-x-auto px-3 py-8">
        <div ref={sheetRef} className="housing-print-target shadow-[0_30px_80px_rgba(0,0,0,0.45)]">
          <HousingSheet data={data} onChange={setData} role={role} />
        </div>
      </div>
      <WhatsAppFab />
    </div>
  )
}
