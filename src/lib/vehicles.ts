import { supabase } from './supabase'

export type Vehicle = {
  id: string
  slug: string
  brand: string
  model: string
  description_en: string
  description_fr: string
  daily_rate_no_driver_xaf: number
  daily_rate_with_driver_xaf: number
  status: 'draft' | 'published' | 'archived'
  sort_order: number
  vehicle_media?: VehicleMedia[]
}

export type VehicleMedia = {
  id: string
  vehicle_id: string
  url: string
  storage_path: string | null
  media_type: 'image' | 'video'
  sort_order: number
}

const vehicleSelect = '*, vehicle_media (*)'

function vehicleFetchFailed(error: { code?: string; message?: string } | null) {
  if (!error) return false
  if (error.code === 'PGRST205' || error.code === '42P01') return true
  return Boolean(error.message?.includes('schema cache') || error.message?.includes('does not exist'))
}

/** Catalogue démo (sans Supabase) — Toyota Corolla Vert & Avensis */
export const demoVehicles: Vehicle[] = [
  {
    id: 'demo-corolla',
    slug: 'toyota-corolla-vert',
    brand: 'Toyota',
    model: 'Corolla Vert',
    description_fr: 'Berline Toyota Corolla Vert — confortable pour la ville et les trajets Douala.',
    description_en: 'Toyota Corolla Vert sedan — comfortable for city and Douala trips.',
    daily_rate_no_driver_xaf: 50_000,
    daily_rate_with_driver_xaf: 60_000,
    status: 'published',
    sort_order: 1,
    vehicle_media: [
      {
        id: 'dm1',
        vehicle_id: 'demo-corolla',
        url: 'https://images.unsplash.com/photo-1550355291-bbee04a92027?auto=format&fit=crop&w=1600&q=80',
        storage_path: null,
        media_type: 'image',
        sort_order: 0,
      },
    ],
  },
  {
    id: 'demo-avensis',
    slug: 'toyota-avensis',
    brand: 'Toyota',
    model: 'Avensis',
    description_fr: 'Toyota Avensis — spacieuse, idéale pour famille ou déplacements professionnels.',
    description_en: 'Toyota Avensis — spacious, ideal for family or business travel.',
    daily_rate_no_driver_xaf: 35_000,
    daily_rate_with_driver_xaf: 45_000,
    status: 'published',
    sort_order: 2,
    vehicle_media: [
      {
        id: 'dm2',
        vehicle_id: 'demo-avensis',
        url: 'https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?auto=format&fit=crop&w=1600&q=80',
        storage_path: null,
        media_type: 'image',
        sort_order: 0,
      },
    ],
  },
]

export async function fetchPublishedVehicles(): Promise<Vehicle[]> {
  if (!supabase) return demoVehicles
  const { data, error } = await supabase
    .from('vehicles')
    .select(vehicleSelect)
    .eq('status', 'published')
    .order('sort_order', { ascending: true })
  if (error) {
    if (vehicleFetchFailed(error)) return demoVehicles
    throw error
  }
  return (data as Vehicle[]) ?? []
}

export async function fetchAllVehicles(): Promise<Vehicle[]> {
  if (!supabase) return demoVehicles
  const { data, error } = await supabase.from('vehicles').select(vehicleSelect).order('sort_order', { ascending: true })
  if (error) {
    if (vehicleFetchFailed(error)) return demoVehicles
    throw error
  }
  return (data as Vehicle[]) ?? []
}

export async function isVehicleAvailable(vehicleId: string, checkIn: string, checkOut: string) {
  if (!supabase) return true
  const { data, error } = await supabase.rpc('check_vehicle_availability', {
    p_vehicle_id: vehicleId,
    p_start: checkIn,
    p_end: checkOut,
  })
  if (error) throw error
  return Boolean(data)
}

export async function addVehicleRental(
  reservationId: string,
  vehicleId: string,
  withDriver: boolean,
  promoCode?: string,
) {
  if (!supabase) throw new Error('Supabase required')
  const { data, error } = await supabase.rpc('add_vehicle_rental', {
    p_reservation_id: reservationId,
    p_vehicle_id: vehicleId,
    p_with_driver: withDriver,
    p_promo_code: promoCode?.trim() || null,
  })
  if (error) throw error
  return data as { total_xaf: number; discount_xaf: number; days: number }
}

async function nextVehicleMediaSortOrder(vehicleId: string) {
  if (!supabase) return 0
  const { data } = await supabase
    .from('vehicle_media')
    .select('sort_order')
    .eq('vehicle_id', vehicleId)
    .order('sort_order', { ascending: false })
    .limit(1)
  return ((data?.[0]?.sort_order as number | undefined) ?? -1) + 1
}

export async function uploadVehicleMedia(file: File, vehicleId: string) {
  if (!supabase) throw new Error('Supabase required')
  const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg'
  const isVideo = file.type.startsWith('video/')
  const path = `vehicles/${vehicleId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`
  const { error } = await supabase.storage.from('property-images').upload(path, file, {
    upsert: true,
    contentType: file.type || (isVideo ? 'video/mp4' : 'image/jpeg'),
  })
  if (error) throw error
  const { data } = supabase.storage.from('property-images').getPublicUrl(path)
  const sort_order = await nextVehicleMediaSortOrder(vehicleId)
  const { error: insertError } = await supabase.from('vehicle_media').insert({
    vehicle_id: vehicleId,
    url: data.publicUrl,
    storage_path: path,
    media_type: isVideo ? 'video' : 'image',
    sort_order,
  })
  if (insertError) throw insertError
  return data.publicUrl
}

export async function addVehicleImageUrl(vehicleId: string, url: string) {
  if (!supabase) throw new Error('Supabase required')
  const trimmed = url.trim()
  if (!trimmed) throw new Error('URL required')
  const sort_order = await nextVehicleMediaSortOrder(vehicleId)
  const { error } = await supabase.from('vehicle_media').insert({
    vehicle_id: vehicleId,
    url: trimmed,
    storage_path: null,
    media_type: trimmed.match(/\.(mp4|webm|mov)(\?|$)/i) ? 'video' : 'image',
    sort_order,
  })
  if (error) throw error
}

export async function deleteVehicleMedia(mediaId: string) {
  if (!supabase) throw new Error('Supabase required')
  const { error } = await supabase.from('vehicle_media').delete().eq('id', mediaId)
  if (error) throw error
}

export function vehicleCover(v: Vehicle): string | undefined {
  const media = [...(v.vehicle_media ?? [])].sort((a, b) => a.sort_order - b.sort_order)
  return media.find((m) => m.media_type === 'image')?.url ?? media[0]?.url
}
