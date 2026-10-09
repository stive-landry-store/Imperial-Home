import { compressPhoto } from './compressImage'
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
  const isVideo = file.type.startsWith('video/')
  const photo = isVideo ? file : await compressPhoto(file, 1400, 0.82)
  const ext = isVideo ? file.name.split('.').pop()?.toLowerCase() || 'mp4' : 'jpg'
  const path = `vehicles/${vehicleId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`
  const { error } = await supabase.storage.from('property-images').upload(path, photo, {
    upsert: true,
    contentType: photo.type || (isVideo ? 'video/mp4' : 'image/jpeg'),
    cacheControl: '31536000',
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

export async function fetchVehicleBySlug(slug: string): Promise<Vehicle | null> {
  if (!supabase) return demoVehicles.find((v) => v.slug === slug) ?? null
  const { data, error } = await supabase.from('vehicles').select(vehicleSelect).eq('slug', slug).maybeSingle()
  if (error) {
    if (vehicleFetchFailed(error)) return demoVehicles.find((v) => v.slug === slug) ?? null
    throw error
  }
  return (data as Vehicle | null) ?? null
}

export type VehiclePromo = { code: string; discount_percent: number }

export async function fetchVehiclePromos(): Promise<VehiclePromo[]> {
  if (!supabase) return [{ code: 'IMPERIAL5', discount_percent: 5 }]
  const { data, error } = await supabase.from('vehicle_promo_codes').select('code, discount_percent').eq('is_active', true)
  if (error) {
    if (vehicleFetchFailed(error)) return []
    throw error
  }
  return (data as VehiclePromo[]) ?? []
}

export type VehicleBooking = {
  id: string
  public_code: string
  days: number
  total_xaf: number
  discount_xaf: number
  status: string
}

export async function bookVehicle(input: {
  vehicleId: string
  start: string
  end: string
  withDriver: boolean
  promoCode?: string
}): Promise<VehicleBooking> {
  if (!supabase) throw new Error('Supabase required')
  const { data, error } = await supabase.rpc('book_vehicle', {
    p_vehicle_id: input.vehicleId,
    p_start: input.start,
    p_end: input.end,
    p_with_driver: input.withDriver,
    p_promo_code: input.promoCode?.trim() || null,
  })
  if (error) throw error
  return data as VehicleBooking
}

export type VehicleRental = {
  id: string
  public_code: string | null
  customer_id: string | null
  reservation_id: string | null
  start_date: string | null
  end_date: string | null
  with_driver: boolean
  days: number
  total_xaf: number
  status: 'requested' | 'confirmed' | 'cancelled'
  created_at: string
  vehicles?: { brand: string; model: string; slug: string } | { brand: string; model: string; slug: string }[] | null
}

const rentalSelect =
  'id, public_code, customer_id, reservation_id, start_date, end_date, with_driver, days, total_xaf, status, created_at, vehicles(brand, model, slug)'

function rentalQueryFailed(error: { code?: string; message?: string } | null) {
  if (!error) return false
  if (vehicleFetchFailed(error)) return true
  return Boolean(error.code === '42703' || error.code === 'PGRST204' || error.message?.includes('start_date') || error.message?.includes('public_code'))
}

export async function fetchMyVehicleRentals(userId: string): Promise<VehicleRental[]> {
  if (!supabase) return []
  const { data, error } = await supabase
    .from('vehicle_rentals')
    .select(rentalSelect)
    .eq('customer_id', userId)
    .order('created_at', { ascending: false })
  if (error) {
    if (rentalQueryFailed(error)) return []
    throw error
  }
  return (data as VehicleRental[]) ?? []
}

export async function fetchVehicleRentals(): Promise<VehicleRental[]> {
  if (!supabase) return []
  const { data, error } = await supabase.from('vehicle_rentals').select(rentalSelect).order('created_at', { ascending: false })
  if (error) {
    if (rentalQueryFailed(error)) return []
    throw error
  }
  return (data as VehicleRental[]) ?? []
}

export async function setVehicleRentalStatus(id: string, status: VehicleRental['status']) {
  if (!supabase) throw new Error('Supabase required')
  const { error } = await supabase.rpc('set_vehicle_rental_status', { p_id: id, p_status: status })
  if (error) throw error
}

export function rentalVehicleName(rental: VehicleRental) {
  const vehicle = Array.isArray(rental.vehicles) ? rental.vehicles[0] : rental.vehicles
  if (!vehicle) return rental.public_code ?? 'Voiture'
  return `${vehicle.brand} ${vehicle.model}`
}
