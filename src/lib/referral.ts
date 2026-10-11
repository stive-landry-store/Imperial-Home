import { supabase } from './supabase'

const KEY = 'ih-referral'

export function captureReferral() {
  const code = new URLSearchParams(window.location.search).get('ref')
  if (code && /^[a-z0-9]{6,12}$/i.test(code)) localStorage.setItem(KEY, code)
}

export async function claimStoredReferral() {
  const code = localStorage.getItem(KEY)
  if (!code || !supabase) return
  const { error } = await supabase.rpc('claim_referral', { p_code: code })
  if (!error) localStorage.removeItem(KEY)
}

export async function fetchReferral() {
  if (!supabase) return { code: '', count: 0 }
  const [code, count] = await Promise.all([supabase.rpc('my_referral_code'), supabase.rpc('my_referral_count')])
  return { code: (code.data as string | null) ?? '', count: (count.data as number | null) ?? 0 }
}
