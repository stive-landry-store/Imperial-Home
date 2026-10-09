import { SITE_DEFAULTS, jsonText } from './config'
import { demoConfig, demoProperties, demoPromotions, demoQuote, demoUnavailable } from './demo'
import { supabase, isSupabaseConfigured } from './supabase'
import type {
  AppNotification,
  DateRange,
  Profile,
  Promotion,
  Property,
  Quote,
  Reservation,
  SiteConfig,
} from '../types/database'

function isSchemaMissing(error: { code?: string; message?: string } | null) {
  if (!error) return false
  return error.code === 'PGRST205' || Boolean(error.message?.includes('schema cache'))
}

const propertySelect = `
  *,
  property_images (*),
  property_amenities ( amenities (*) )
`

export async function fetchSiteConfig(): Promise<SiteConfig> {
  if (!supabase) return demoConfig
  const { data, error } = await supabase.from('system_config').select('key, value')
  if (error || !data?.length) return demoConfig
  const map = Object.fromEntries(data.map((row) => [row.key, jsonText(row.value, '')]))
  return {
    brand_name: map.brand_name || SITE_DEFAULTS.brand_name,
    phone: map.phone || SITE_DEFAULTS.phone,
    whatsapp: map.whatsapp || SITE_DEFAULTS.whatsapp,
    email: map.email || SITE_DEFAULTS.email,
    city: map.city || SITE_DEFAULTS.city,
    hold_minutes: map.hold_minutes || SITE_DEFAULTS.hold_minutes,
    payment_instructions_en: map.payment_instructions_en || SITE_DEFAULTS.payment_instructions_en,
    payment_instructions_fr: map.payment_instructions_fr || SITE_DEFAULTS.payment_instructions_fr,
    home_fiche_image_url: map.home_fiche_image_url || SITE_DEFAULTS.home_fiche_image_url,
    home_hero_image_url: map.home_hero_image_url || SITE_DEFAULTS.home_hero_image_url,
    place_address: map.place_address || SITE_DEFAULTS.place_address,
    place_latitude: map.place_latitude || SITE_DEFAULTS.place_latitude,
    place_longitude: map.place_longitude || SITE_DEFAULTS.place_longitude,
  }
}

export async function fetchPublishedProperties(): Promise<Property[]> {
  if (!supabase) return demoProperties
  const { data, error } = await supabase
    .from('properties')
    .select(propertySelect)
    .eq('status', 'published')
    .order('nightly_rate_xaf', { ascending: false })
  if (error) {
    if (isSchemaMissing(error)) return demoProperties
    throw error
  }
  return (data as Property[]) ?? []
}

export async function fetchAllProperties(): Promise<Property[]> {
  if (!supabase) return demoProperties
  const { data, error } = await supabase
    .from('properties')
    .select(propertySelect)
    .neq('status', 'archived')
    .order('created_at', { ascending: false })
  if (error) {
    if (isSchemaMissing(error)) return demoProperties
    throw error
  }
  return (data as Property[]) ?? []
}

export async function fetchPropertyBySlug(slug: string): Promise<Property | null> {
  if (!supabase) return demoProperties.find((p) => p.slug === slug) ?? null
  const { data, error } = await supabase.from('properties').select(propertySelect).eq('slug', slug).maybeSingle()
  if (error) {
    if (isSchemaMissing(error)) return demoProperties.find((p) => p.slug === slug) ?? null
    throw error
  }
  return (data as Property) ?? null
}

export async function fetchPropertyById(id: string): Promise<Property | null> {
  if (!supabase) return demoProperties.find((p) => p.id === id) ?? null
  const { data, error } = await supabase.from('properties').select(propertySelect).eq('id', id).maybeSingle()
  if (error) {
    if (isSchemaMissing(error)) return demoProperties.find((p) => p.id === id) ?? null
    throw error
  }
  return (data as Property) ?? null
}

export async function fetchPromotions(): Promise<Promotion[]> {
  if (!supabase) return demoPromotions
  const { data, error } = await supabase.from('promotions').select('*, promotion_properties ( property_id )')
  if (error) {
    if (isSchemaMissing(error)) return demoPromotions
    throw error
  }
  return (data as Promotion[]) ?? []
}

export async function fetchUnavailableRanges(propertyId: string): Promise<DateRange[]> {
  if (!supabase) return demoUnavailable[propertyId] ?? []
  const { data, error } = await supabase.rpc('get_unavailable_ranges', { p_property_id: propertyId })
  if (error) {
    if (isSchemaMissing(error)) return demoUnavailable[propertyId] ?? []
    throw error
  }
  return (data as DateRange[]) ?? []
}

export async function fetchQuote(
  property: Property,
  checkIn: string,
  checkOut: string,
  guests: number,
  promoCode?: string,
  serviceIds: string[] = [],
): Promise<Quote> {
  if (!supabase) return demoQuote(property, checkIn, checkOut, guests)
  const args = {
    p_property_id: property.id,
    p_check_in: checkIn,
    p_check_out: checkOut,
    p_guest_count: guests,
    p_promo_code: promoCode?.trim() || null,
    p_service_ids: serviceIds,
  }
  let { data, error } = await supabase.rpc('quote_stay', args)
  if (error && /could not find the function|PGRST202/i.test(error.message)) {
    const fallback = await supabase.rpc('quote_stay', {
      p_property_id: property.id,
      p_check_in: checkIn,
      p_check_out: checkOut,
      p_guest_count: guests,
    })
    data = fallback.data
    error = fallback.error
  }
  if (error) {
    if (isSchemaMissing(error)) return demoQuote(property, checkIn, checkOut, guests)
    throw error
  }
  return data as Quote
}

export async function createBooking(
  propertyId: string,
  checkIn: string,
  checkOut: string,
  guests: number,
  promoCode?: string,
  serviceIds: string[] = [],
) {
  if (!supabase) throw new Error('Connect Supabase to create a live booking.')
  let { data, error } = await supabase.rpc('create_booking', {
    p_property_id: propertyId,
    p_check_in: checkIn,
    p_check_out: checkOut,
    p_guest_count: guests,
    p_promo_code: promoCode?.trim() || null,
    p_service_ids: serviceIds,
  })
  if (error && /could not find the function|PGRST202/i.test(error.message)) {
    const fallback = await supabase.rpc('create_booking', {
      p_property_id: propertyId,
      p_check_in: checkIn,
      p_check_out: checkOut,
      p_guest_count: guests,
    })
    data = fallback.data
    error = fallback.error
  }
  if (error) throw error
  return data as { id: string; public_code: string; status: string; total_amount_xaf: number; hold_expires_at: string }
}

export async function fetchMyReservations(): Promise<Reservation[]> {
  if (!supabase) return []
  const { data, error } = await supabase
    .from('reservations')
    .select('*, properties (*), payments (*), documents (*)')
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data as Reservation[]) ?? []
}

export async function fetchReservation(id: string): Promise<Reservation | null> {
  if (!supabase) return null
  const { data, error } = await supabase
    .from('reservations')
    .select('*, properties (*), payments (*), documents (*), profiles:customer_id (*)')
    .eq('id', id)
    .maybeSingle()
  if (error) throw error
  return (data as Reservation) ?? null
}

export async function fetchAllReservations(): Promise<Reservation[]> {
  if (!supabase) return []
  const { data, error } = await supabase
    .from('reservations')
    .select('*, properties ( name, slug ), payments ( status, amount_xaf ), profiles:customer_id ( full_name, email, phone, cni )')
    .order('check_in', { ascending: true })
  if (error) throw error
  return (data as Reservation[]) ?? []
}

export async function confirmPayment(reservationId: string, note?: string) {
  if (!supabase) throw new Error('Connect Supabase first.')
  const { data, error } = await supabase.rpc('confirm_payment', {
    p_reservation_id: reservationId,
    p_note: note ?? 'Verified receipt',
  })
  if (error) throw error
  return data
}

export async function cancelReservation(reservationId: string, reason?: string) {
  if (!supabase) throw new Error('Connect Supabase first.')
  const { data, error } = await supabase.rpc('cancel_reservation', {
    p_reservation_id: reservationId,
    p_reason: reason ?? null,
  })
  if (error) throw error
  return data
}

export async function rejectPayment(reservationId: string, reason?: string) {
  if (!supabase) throw new Error('Connect Supabase first.')
  const { data, error } = await supabase.rpc('reject_payment', {
    p_reservation_id: reservationId,
    p_reason: reason ?? 'Rejected by administrator',
  })
  if (error) throw error
  return data
}

export async function fetchMyNotifications(): Promise<AppNotification[]> {
  if (!supabase) return []
  const { data: auth } = await supabase.auth.getSession()
  const userId = auth.session?.user.id
  if (!userId) return []
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(30)
  if (error) throw error
  return (data as AppNotification[]) ?? []
}

export async function markNotificationRead(id: string) {
  if (!supabase) return
  const { error } = await supabase.from('notifications').update({ read_at: new Date().toISOString() }).eq('id', id)
  if (error) throw error
}

export async function fetchProfile(userId: string): Promise<Profile | null> {
  if (!supabase) return null
  const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle()
  if (error) throw error
  return data as Profile | null
}

export { isSupabaseConfigured }
