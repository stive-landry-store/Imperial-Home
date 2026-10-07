import type { TFunction } from 'i18next'

export function formatAuthError(error: unknown, t: TFunction): string {
  const message =
    error instanceof Error
      ? error.message
      : typeof error === 'object' && error && 'message' in error
        ? String((error as { message: unknown }).message)
        : ''
  const lower = message.toLowerCase()

  if (lower.includes('redirect') || lower.includes('url') || lower.includes('allowed')) {
    return t('auth.forgotRedirectError', { urls: authRedirectHintInline() })
  }
  if (lower.includes('rate') || lower.includes('limit') || lower.includes('too many')) {
    return t('auth.forgotRateLimit')
  }
  if (lower.includes('email') && lower.includes('invalid')) {
    return t('auth.forgotInvalidEmail')
  }
  return t('auth.resetError')
}

function authRedirectHintInline() {
  const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5173'
  const configured = import.meta.env.VITE_APP_URL?.replace(/\/$/, '')
  const urls = new Set([`${origin}/reset-password`, 'http://localhost:5173/reset-password', 'http://localhost:5174/reset-password'])
  if (configured) urls.add(`${configured}/reset-password`)
  return [...urls].join(', ')
}
