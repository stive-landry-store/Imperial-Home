import { compressPhoto } from './compressImage'
import { supabase } from './supabase'

export async function sendChatMessage(input: {
  conversationId: string
  senderId: string
  role: 'customer' | 'admin'
  body: string
  file: File | null
}) {
  if (!supabase) return 'offline'
  const text = input.body.trim()
  if (!text && !input.file) return 'empty'
  const { data: msg, error } = await supabase
    .from('messages')
    .insert({
      conversation_id: input.conversationId,
      sender_id: input.senderId,
      role: input.role,
      body: text,
    })
    .select('id')
    .single()
  if (error || !msg) return error?.message || 'error'
  if (input.file) {
    const photo = await compressPhoto(input.file, 1400, 0.82)
    if (photo.size > 5_000_000) return 'large'
    const ext = photo.type === 'image/png' ? 'png' : photo.type === 'image/webp' ? 'webp' : 'jpg'
    const path = `${input.senderId}/${input.conversationId}/${msg.id}.${ext}`
    const uploaded = await supabase.storage.from('chat-attachments').upload(path, photo, {
      contentType: photo.type || 'image/jpeg',
      cacheControl: '31536000',
    })
    if (!uploaded.error) {
      await supabase.from('message_attachments').insert({
        message_id: msg.id,
        storage_path: path,
        mime_type: 'image/jpeg',
        size_bytes: photo.size,
      })
    }
  }
  await supabase.from('conversations').update({ last_message_at: new Date().toISOString() }).eq('id', input.conversationId)
  return null
}

export async function signedAttachmentUrls(paths: string[]) {
  const map = new Map<string, string>()
  if (!supabase || !paths.length) return map
  const { data } = await supabase.storage.from('chat-attachments').createSignedUrls(paths, 60 * 60)
  for (const row of data ?? []) {
    if (row.path && row.signedUrl) map.set(row.path, row.signedUrl)
  }
  return map
}
