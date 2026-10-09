import { compressPhoto } from './compressImage'
import { supabase } from './supabase'

export async function uploadPropertyImage(file: File, propertyId: string) {
  if (!supabase) throw new Error('Supabase required')
  const photo = await compressPhoto(file, 1400, 0.82)
  const path = `${propertyId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`
  const { error } = await supabase.storage.from('property-images').upload(path, photo, {
    upsert: true,
    contentType: 'image/jpeg',
    cacheControl: '31536000',
  })
  if (error) throw error
  const { data } = supabase.storage.from('property-images').getPublicUrl(path)
  return { url: data.publicUrl, storage_path: path }
}

export function slugifyRoomName(name: string) {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

async function nextPropertyImageSortOrder(propertyId: string) {
  if (!supabase) return 0
  const { data } = await supabase
    .from('property_images')
    .select('sort_order')
    .eq('property_id', propertyId)
    .order('sort_order', { ascending: false })
    .limit(1)
  return ((data?.[0]?.sort_order as number | undefined) ?? -1) + 1
}

async function propertyHasCover(propertyId: string) {
  if (!supabase) return false
  const { count } = await supabase
    .from('property_images')
    .select('id', { count: 'exact', head: true })
    .eq('property_id', propertyId)
    .eq('is_cover', true)
  return (count ?? 0) > 0
}

export async function addPropertyImageRecord(
  propertyId: string,
  url: string,
  opts?: { storage_path?: string | null; is_cover?: boolean; name?: string },
) {
  if (!supabase) throw new Error('Supabase required')
  const sort_order = await nextPropertyImageSortOrder(propertyId)
  const hasCover = await propertyHasCover(propertyId)
  const is_cover = opts?.is_cover ?? !hasCover
  const label = opts?.name?.trim() || 'apartment'
  if (is_cover && hasCover) {
    const { error: clearError } = await supabase
      .from('property_images')
      .update({ is_cover: false })
      .eq('property_id', propertyId)
    if (clearError) throw clearError
  }
  const { error } = await supabase.from('property_images').insert({
    property_id: propertyId,
    url,
    storage_path: opts?.storage_path ?? null,
    is_cover,
    sort_order,
    alt_en: `${label} apartment`,
    alt_fr: `Appartement ${label}`,
  })
  if (error) throw error
}

export async function uploadAndAddPropertyImage(file: File, propertyId: string, name: string) {
  const uploaded = await uploadPropertyImage(file, propertyId)
  await addPropertyImageRecord(propertyId, uploaded.url, { storage_path: uploaded.storage_path, name })
}

export async function addPropertyImageUrl(propertyId: string, url: string, name: string) {
  const trimmed = url.trim()
  if (!trimmed) throw new Error('URL required')
  await addPropertyImageRecord(propertyId, trimmed, { name })
}

export async function deletePropertyImage(imageId: string) {
  if (!supabase) throw new Error('Supabase required')
  const { error } = await supabase.from('property_images').delete().eq('id', imageId)
  if (error) throw error
}

export async function setPropertyCoverImage(propertyId: string, imageId: string) {
  if (!supabase) throw new Error('Supabase required')
  const { error: clearError } = await supabase
    .from('property_images')
    .update({ is_cover: false })
    .eq('property_id', propertyId)
  if (clearError) throw clearError
  const { error } = await supabase.from('property_images').update({ is_cover: true }).eq('id', imageId)
  if (error) throw error
}
