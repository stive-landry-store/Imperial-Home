// Two-factor authentication (TOTP) for administrators, on top of Supabase Auth MFA.
// Conçu par stive landry store (NYAMI TCHOUPE STIVE LANDRY).
import { supabase } from './supabase'

export type MfaState = { current: 'aal1' | 'aal2' | null; next: 'aal1' | 'aal2' | null; required: boolean }

export async function readMfaState(): Promise<MfaState> {
  if (!supabase) return { current: null, next: null, required: false }
  const [{ data: level }, { data: config }] = await Promise.all([
    supabase.auth.mfa.getAuthenticatorAssuranceLevel(),
    supabase.from('system_config').select('value').eq('key', 'require_admin_mfa').maybeSingle(),
  ])
  return {
    current: (level?.currentLevel as MfaState['current']) ?? null,
    next: (level?.nextLevel as MfaState['next']) ?? null,
    required: config?.value === true || config?.value === 'true',
  }
}

export async function verifyTotp(code: string, factorId?: string) {
  if (!supabase) throw new Error('Supabase is not configured')
  let id = factorId
  if (!id) {
    const { data, error } = await supabase.auth.mfa.listFactors()
    if (error) throw error
    id = data.totp.find((f) => f.status === 'verified')?.id
  }
  if (!id) throw new Error('No authenticator')
  const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({ factorId: id })
  if (challengeError) throw challengeError
  const { error } = await supabase.auth.mfa.verify({ factorId: id, challengeId: challenge.id, code: code.trim() })
  if (error) throw error
}
