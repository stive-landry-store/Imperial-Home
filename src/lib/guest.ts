import { supabase } from './supabase'
import type { Review, StayService, TurnoverTask, WaitlistEntry } from '../types/database'

function quiet<T>(value: T) {
  return value
}

export async function fetchStayServices(): Promise<StayService[]> {
  if (!supabase) return []
  const { data, error } = await supabase.from('stay_services').select('*').eq('is_active', true).order('sort_order')
  if (error) return []
  return (data as StayService[]) ?? []
}

export async function fetchPublishedReviews(propertyId: string): Promise<Review[]> {
  if (!supabase) return []
  const { data, error } = await supabase
    .from('reviews')
    .select('id, property_id, reservation_id, customer_id, rating, body, status, created_at')
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
}) {
  if (!supabase) throw new Error('Connect Supabase first.')
  const { error } = await supabase.from('reviews').insert({
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
