import type { TFunction } from 'i18next'
import { authRedirectHint } from './authRedirect'

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
  return authRedirectHint().replaceAll('\n', ', ')
}
