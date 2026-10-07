import { useState, type FormEvent } from 'react'
import { Helmet } from 'react-helmet-async'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Button } from '../../components/ui/Button'
import { Input, Label } from '../../components/ui/Field'
import { useAuth } from '../../hooks/useAuth'
import { formatAuthError } from '../../lib/authErrors'
import { authRedirectHint } from '../../lib/authRedirect'
import { isSupabaseConfigured } from '../../lib/supabase'
import { ImperialLogo } from '../../components/brand/Logo'
import { useTheme } from '../../hooks/useTheme'

export function ForgotPasswordPage() {
  const { t } = useTranslation()
  const { theme } = useTheme()
  const { resetPassword } = useAuth()
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [redirectHint, setRedirectHint] = useState(false)
  const [pending, setPending] = useState(false)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setPending(true)
    setError(null)
    setRedirectHint(false)
    try {
      await resetPassword(email.trim())
      setSent(true)
    } catch (err) {
      const message =
        err instanceof Error ? err.message.toLowerCase() : typeof err === 'object' && err && 'message' in err ? String((err as { message: unknown }).message).toLowerCase() : ''
      setRedirectHint(message.includes('redirect') || message.includes('url') || message.includes('allowed'))
      setError(formatAuthError(err, t))
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="theme-page mx-auto max-w-md px-4 pt-36 pb-20">
      <Helmet>
        <title>{t('auth.forgotTitle')} | Imperial Home</title>
      </Helmet>
      <ImperialLogo compact light={theme === 'dark'} />
      <h1 className="mt-8 font-display text-4xl">{t('auth.forgotTitle')}</h1>
      <p className="mt-3 text-sm opacity-70">{t('auth.forgotLead')}</p>
      {sent ? (
        <p className="theme-card mt-8 p-6 text-sm leading-relaxed">{t('auth.forgotSent')}</p>
      ) : (
        <form className="theme-card mt-8 space-y-4 p-6" onSubmit={(e) => void onSubmit(e)}>
          <div>
            <Label>{t('auth.email')}</Label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
          </div>
          {error ? (
            <div className="space-y-2 text-sm text-red-500">
              <p>{error}</p>
              {redirectHint ? (
                <pre className="overflow-x-auto rounded border border-red-500/30 bg-red-500/5 p-3 text-xs whitespace-pre-wrap text-red-400">
                  {authRedirectHint()}
                </pre>
              ) : null}
            </div>
          ) : null}
          <Button type="submit" className="w-full" disabled={pending || !isSupabaseConfigured()}>
            {t('auth.forgotSubmit')}
          </Button>
        </form>
      )}
      <Link to="/login" className="mt-4 block text-center text-sm text-[#d4af6a]">
        {t('auth.toLogin')}
      </Link>
    </div>
  )
}
