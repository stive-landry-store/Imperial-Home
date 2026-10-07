import { supabase } from './supabase'

export async function uploadSiteImage(file: File, folder: string) {
  if (!supabase) throw new Error('Supabase required')
  const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg'
  const path = `${folder}/${Date.now()}.${ext}`
  const { error } = await supabase.storage.from('property-images').upload(path, file, {
    upsert: true,
    contentType: file.type || 'image/jpeg',
  })
  if (error) throw error
  const { data } = supabase.storage.from('property-images').getPublicUrl(path)
  return data.publicUrl
}
