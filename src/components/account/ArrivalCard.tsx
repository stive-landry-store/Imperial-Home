import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { DoorOpen, KeyRound, MapPin } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { localized } from '../../lib/format'
import type { Arrival } from '../../types/database'

// Contactless check-in: door code, times and the arrival guide, opened the day before arrival.
// Conçu par stive landry store (NYAMI TCHOUPE STIVE LANDRY).

async function fetchArrival(id: string): Promise<Arrival | null> {
  if (!supabase) return null
  const { data, error } = await supabase.rpc('my_arrival', { p_reservation_id: id })
  if (error) return null
  return data as Arrival
}

export function ArrivalCard({ reservationId }: { reservationId: string }) {
  const { t, i18n } = useTranslation()
  const { data } = useQuery({ queryKey: ['arrival', reservationId], queryFn: () => fetchArrival(reservationId), staleTime: 60_000 })
  if (!data) return null
  const guide = localized(data.guide_en ?? data.access_notes_en, data.guide_fr ?? data.access_notes_fr, i18n.language)
  const map =
    data.latitude && data.longitude ? `https://www.google.com/maps/dir/?api=1&destination=${data.latitude},${data.longitude}` : null

  return (
    <section className="ih-card theme-card mt-6 overflow-hidden rounded-3xl border border-[#d4af6a]/30 p-5">
      <h3 className="flex items-center gap-2 font-display text-xl">
        <DoorOpen className="h-5 w-5 text-[#d4af6a]" /> {t('arrival.title')}
      </h3>
      <p className="mt-1 text-sm theme-muted">
        {t('arrival.times', { arrival: data.arrival_time ?? '14:00', departure: data.departure_time ?? '11:00' })}
      </p>
      {data.open ? (
        <>
          {data.access_code ? (
            <div className="ih-pop mt-4 rounded-2xl bg-black/40 p-4 text-center">
              <p className="flex items-center justify-center gap-2 text-xs tracking-[0.3em] text-[#d4af6a] uppercase">
                <KeyRound className="h-4 w-4" /> {t('arrival.code')}
              </p>
              <p className="ih-gold-text mt-2 font-display text-4xl tracking-[0.35em]">{data.access_code}</p>
            </div>
          ) : null}
          {guide ? <p className="mt-4 text-sm whitespace-pre-line">{guide}</p> : null}
        </>
      ) : (
        <p className="mt-4 rounded-2xl border border-white/10 p-4 text-sm theme-muted">
          {t('arrival.opensOn', { date: new Date(`${data.opens_on}T12:00:00`).toLocaleDateString(i18n.language) })}
        </p>
      )}
      {map ? (
        <a href={map} target="_blank" rel="noreferrer" className="ih-btn mt-4 inline-flex items-center gap-2 rounded-full border border-[#d4af6a]/50 px-4 py-2 text-sm text-[#d4af6a]">
          <MapPin className="h-4 w-4" /> {t('arrival.directions')}
        </a>
      ) : null}
    </section>
  )
}
