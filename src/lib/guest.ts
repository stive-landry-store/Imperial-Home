import { supabase } from './supabase'
import { compressPhoto } from './compressImage'
import type { Review, StayService, TurnoverTask, WaitlistEntry } from '../types/database'

function quiet<T>(value: T) {
  return value
}

/** Built-in options the owner asked to take off the booking page. New options added in settings still appear. */
const RETIRED_EXTRAS = new Set(['airport', 'late-checkout', 'mid-clean', 'baby-bed'])

export async function fetchStayServices(): Promise<StayService[]> {
  if (!supabase) return []
  const { data, error } = await supabase.from('stay_services').select('*').eq('is_active', true).order('sort_order')
  if (error) return []
  return ((data as StayService[]) ?? []).filter((service) => !RETIRED_EXTRAS.has(service.slug))
}

export async function fetchStayServicesForAdmin(): Promise<StayService[]> {
  if (!supabase) return []
  const { data, error } = await supabase.from('stay_services').select('*').eq('is_active', true).order('sort_order')
  if (error) throw error
  return ((data as StayService[]) ?? []).filter((service) => !RETIRED_EXTRAS.has(service.slug))
}

function extraSlug(name: string) {
  const base = name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 32)
  return `${base || 'option'}-${Date.now().toString(36)}`
}

export async function addStayService(name: string, priceXaf: number) {
  if (!supabase) throw new Error('Connect Supabase first.')
  const label = name.trim()
  const { error } = await supabase.from('stay_services').insert({
    slug: extraSlug(label),
    name_en: label,
    name_fr: label,
    price_xaf: priceXaf,
    is_active: true,
    sort_order: 100,
  })
  if (error) throw error
}

export async function removeStayService(id: string) {
  if (!supabase) throw new Error('Connect Supabase first.')
  const removed = await supabase.from('stay_services').delete().eq('id', id)
  if (!removed.error) return
  const hidden = await supabase.from('stay_services').update({ is_active: false }).eq('id', id)
  if (hidden.error) throw hidden.error
}

export async function fetchPublishedReviews(propertyId: string): Promise<Review[]> {
  if (!supabase) return []
  const { data, error } = await supabase
    .from('reviews')
    .select('*')
    .eq('property_id', propertyId)
    .eq('status', 'published')
    .order('created_at', { ascending: false })
  if (error) return []
  return (data as Review[]) ?? []
}

export async function fetchAllReviews(): Promise<Review[]> {
  if (!supabase) return []
  const { data, error } = await supabase.from('reviews').select('*').order('created_at', { ascending: false })
  if (error) throw error
  return (data as Review[]) ?? []
}

export async function publishReview(input: {
  propertyId: string
  reservationId: string
  customerId: string
  rating: number
  body: string
  photos?: File[]
}) {
  if (!supabase) throw new Error('Connect Supabase first.')
  const urls: string[] = []
  for (const file of (input.photos ?? []).slice(0, 4)) {
    const photo = await compressPhoto(file, 1400, 0.82)
    const path = `${input.customerId}/${input.reservationId}-${urls.length}-${Date.now()}.jpg`
    const { error: uploadError } = await supabase.storage.from('review-photos').upload(path, photo, {
      contentType: 'image/jpeg',
      cacheControl: '31536000',
    })
    if (uploadError) throw uploadError
    urls.push(supabase.storage.from('review-photos').getPublicUrl(path).data.publicUrl)
  }
  const { error } = await supabase.from('reviews').insert({
    ...(urls.length ? { photos: urls } : {}),
    property_id: input.propertyId,
    reservation_id: input.reservationId,
    customer_id: input.customerId,
    rating: input.rating,
    body: input.body.trim(),
    status: 'published',
  })
  if (error) throw error
}

export async function setReviewStatus(id: string, status: 'published' | 'hidden') {
  if (!supabase) return
  const { error } = await supabase.from('reviews').update({ status }).eq('id', id)
  if (error) throw error
}

export async function joinWaitlist(input: {
  propertyId: string
  customerId?: string | null
  fullName: string
  email: string
  phone: string
  checkIn: string
  checkOut: string
  guests: number
}) {
  if (!supabase) throw new Error('Connect Supabase first.')
  const { error } = await supabase.from('waitlist').insert({
    property_id: input.propertyId,
    customer_id: input.customerId ?? null,
    full_name: input.fullName,
    email: input.email.trim(),
    phone: input.phone.trim() || null,
    check_in: input.checkIn,
    check_out: input.checkOut,
    guest_count: input.guests,
  })
  if (error) throw error
}

export async function fetchWaitlist(): Promise<WaitlistEntry[]> {
  if (!supabase) return []
  const { data, error } = await supabase
    .from('waitlist')
    .select('*, properties ( name )')
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data as WaitlistEntry[]) ?? []
}

export async function submitReceipt(reservationId: string, provider: 'mtn_momo' | 'orange_money', phone: string, file: File) {
  if (!supabase) throw new Error('Connect Supabase first.')
  const { data: auth } = await supabase.auth.getUser()
  const userId = auth.user?.id
  if (!userId) throw new Error('Not authenticated')
  const path = `${userId}/${reservationId}/${Date.now()}-${file.name.replace(/[^\w.]+/g, '-')}`
  const { error: uploadError } = await supabase.storage.from('payment-receipts').upload(path, file, {
    contentType: file.type || 'image/jpeg',
    upsert: false,
  })
  if (uploadError) throw uploadError
  const { error } = await supabase.rpc('submit_payment_receipt', {
    p_reservation_id: reservationId,
    p_provider: provider,
    p_phone: phone,
    p_path: path,
  })
  if (error) throw error
}

export async function receiptUrl(path: string) {
  if (!supabase) return null
  const { data, error } = await supabase.storage.from('payment-receipts').createSignedUrl(path, 180)
  if (error) return null
  return data.signedUrl
}

export async function fetchTurnover(): Promise<TurnoverTask[]> {
  if (!supabase) return []
  const { data, error } = await supabase
    .from('turnover_tasks')
    .select('*, reservations ( public_code ), properties ( name )')
    .order('due_on')
  if (error) throw error
  return (data as TurnoverTask[]) ?? []
}

export async function setTurnoverDone(id: string, done: boolean) {
  if (!supabase) return
  const { error } = await supabase
    .from('turnover_tasks')
    .update({ done_at: done ? new Date().toISOString() : null })
    .eq('id', id)
  if (error) throw error
}

export async function syncFavorite(userId: string, propertyId: string, saved: boolean) {
  if (!supabase) return
  if (saved) {
    const { error } = await supabase.from('favorites').upsert({ user_id: userId, property_id: propertyId })
    if (error) return quiet(error)
    return
  }
  await supabase.from('favorites').delete().eq('user_id', userId).eq('property_id', propertyId)
}

export async function fetchIcal(token: string) {
  if (!supabase) return null
  const { data, error } = await supabase.rpc('ical_feed', { p_token: token })
  if (error) return null
  return typeof data === 'string' ? data : null
}

export async function scheduleCleaning(input: {
  reservationId: string
  date: string
  time: string
  note?: string
  taskId?: string
}) {
  if (!supabase) throw new Error('Connect Supabase first.')
  const { error } = await supabase.rpc('schedule_cleaning', {
    p_reservation_id: input.reservationId,
    p_date: input.date,
    p_time: input.time,
    p_note: input.note?.trim() || null,
    p_task_id: input.taskId ?? null,
  })
  if (error) throw error
}

export async function fetchRatings(): Promise<Record<string, { average: number; count: number }>> {
  if (!supabase) return {}
  const { data, error } = await supabase.from('reviews').select('property_id, rating').eq('status', 'published')
  if (error) return {}
  const totals: Record<string, { sum: number; count: number }> = {}
  for (const row of (data as { property_id: string; rating: number }[]) ?? []) {
    const entry = (totals[row.property_id] ??= { sum: 0, count: 0 })
    entry.sum += row.rating
    entry.count += 1
  }
  return Object.fromEntries(Object.entries(totals).map(([id, v]) => [id, { average: v.sum / v.count, count: v.count }]))
}
