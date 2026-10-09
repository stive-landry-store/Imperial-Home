import type { TFunction } from 'i18next'

function rawMessage(error: unknown): string {
  if (error instanceof Error) return error.message
  if (typeof error === 'object' && error && 'message' in error) return String((error as { message: unknown }).message)
  return ''
}

export function formatLoginRegisterError(error: unknown, t: TFunction, mode: 'login' | 'register'): string {
  const message = rawMessage(error)
  const lower = message.toLowerCase()

  if (!message) return mode === 'login' ? t('auth.error') : t('auth.registerError')

  if (lower.includes('supabase is not configured') || lower.includes('not configured')) {
    return t('auth.configure')
  }
  if (lower.includes('email not confirmed') || lower.includes('not confirmed')) {
    return t('auth.error')
  }
  if (lower.includes('invalid login credentials') || lower.includes('invalid credentials')) {
    return t('auth.invalidCredentials')
  }
  if (lower.includes('user already registered') || lower.includes('already registered')) {
    return t('auth.alreadyRegistered')
  }
  if (lower.includes('password') && lower.includes('least')) {
    return t('auth.passwordTooShort')
  }
  if (lower.includes('rate limit') || lower.includes('too many')) {
    return t('auth.forgotRateLimit')
  }

  return message
}
