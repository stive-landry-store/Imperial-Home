import { supabase } from './supabase'
import type { PublicReview } from '../types/database'

export async function fetchPublicReviews(propertyId?: string): Promise<PublicReview[]> {
  if (!supabase) return []
  const { data, error } = await supabase.rpc('public_reviews', { p_limit: 100, p_property_id: propertyId ?? null })
  if (error) return []
  return (data ?? []) as PublicReview[]
}
