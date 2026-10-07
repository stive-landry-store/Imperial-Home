import { supabase } from './supabase'

export async function promoteUserToAdmin(email: string, title: string) {
  if (!supabase) throw new Error('Supabase required')
  const { data, error } = await supabase.rpc('promote_user_to_admin', {
    p_email: email.trim(),
    p_title: title.trim() || 'Administrateur',
  })
  if (error) throw error
  return data as string
}

export async function deactivateAdmin(userId: string) {
  if (!supabase) throw new Error('Supabase required')
  const { error } = await supabase.rpc('deactivate_admin', { p_user_id: userId })
  if (error) throw error
}

export async function reactivateAdmin(userId: string, title?: string) {
  if (!supabase) throw new Error('Supabase required')
  const { error } = await supabase.rpc('reactivate_admin', {
    p_user_id: userId,
    p_title: title?.trim() || null,
  })
  if (error) throw error
}

export async function updateAdminTitle(userId: string, title: string) {
  if (!supabase) throw new Error('Supabase required')
  const { error } = await supabase.from('admin_profiles').update({ title: title.trim() }).eq('id', userId)
  if (error) throw error
}

export async function searchProfilesByEmail(email: string) {
  if (!supabase) return []
  const q = email.trim().toLowerCase()
  if (!q) return []
  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, email, role')
    .ilike('email', `%${q}%`)
    .limit(8)
  if (error) throw error
  return data ?? []
}
