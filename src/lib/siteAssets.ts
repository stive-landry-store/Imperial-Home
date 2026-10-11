import { compressPhoto } from './compressImage'
import { supabase } from './supabase'

export async function uploadSiteImage(file: File, folder: string) {
  if (!supabase) throw new Error('Supabase required')
  const photo = await compressPhoto(file, folder.includes('hero') ? 1600 : 1400, 0.82)
  const path = `${folder}/${Date.now()}.jpg`
  const { error } = await supabase.storage.from('property-images').upload(path, photo, {
    upsert: true,
    contentType: 'image/jpeg',
    cacheControl: '31536000',
  })
  if (error) throw error
  const { data } = supabase.storage.from('property-images').getPublicUrl(path)
  return data.publicUrl
}

export async function uploadSiteVideo(file: File, folder: string) {
  if (!supabase) throw new Error('Supabase required')
  const extension = file.name.split('.').pop()?.toLowerCase() || 'mp4'
  const path = `${folder}/${Date.now()}.${extension}`
  const { error } = await supabase.storage.from('property-images').upload(path, file, {
    contentType: file.type || 'video/mp4',
    cacheControl: '31536000',
  })
  if (error) throw error
  return supabase.storage.from('property-images').getPublicUrl(path).data.publicUrl
}
