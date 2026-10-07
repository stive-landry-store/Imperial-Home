import { useEffect, useState, type FormEvent } from 'react'
import { Helmet } from 'react-helmet-async'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Button } from '../../components/ui/Button'
import { Label } from '../../components/ui/Field'
import { PasswordField } from '../../components/ui/PasswordField'
import { useAuth } from '../../hooks/useAuth'
import { formatAuthError } from '../../lib/authErrors'
import { isSupabaseConfigured, supabase } from '../../lib/supabase'
import { ImperialLogo } from '../../components/brand/Logo'
import { useTheme } from '../../hooks/useTheme'

export function ResetPasswordPage() {
  const { t } = useTranslation()
  const { theme } = useTheme()
  const { updatePassword } = useAuth()
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [ready, setReady] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  useEffect(() => {
    if (!supabase) return
    const client = supabase

    function markReady() {
      setReady(true)
    }

    const hash = window.location.hash.replace(/^#/, '')
    if (hash) {
      const params = new URLSearchParams(hash)
      if (params.get('type') === 'recovery' || params.get('access_token')) markReady()
    }

    const { data } = client.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN') markReady()
    })

    void client.auth.getSession().then(({ data: session }) => {
      if (session.session) markReady()
    })

    return () => data.subscription.unsubscribe()
  }, [])

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (password !== confirm) {
      setError(t('auth.passwordMismatch'))
      return
    }
    setPending(true)
    setError(null)
    try {
      await updatePassword(password)
      navigate('/account')
    } catch (err) {
      setError(formatAuthError(err, t))
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="theme-page mx-auto max-w-md px-4 pt-36 pb-20">
      <Helmet>
        <title>{t('auth.resetTitle')} | Imperial Home</title>
      </Helmet>
      <ImperialLogo compact light={theme === 'dark'} />
      <h1 className="mt-8 font-display text-4xl">{t('auth.resetTitle')}</h1>
      <p className="mt-3 text-sm opacity-70">{t('auth.resetLead')}</p>
      {!ready ? (
        <p className="theme-card mt-8 p-6 text-sm leading-relaxed">{t('auth.resetNeedLink')}</p>
      ) : (
        <form className="theme-card mt-8 space-y-4 p-6" onSubmit={(e) => void onSubmit(e)}>
          <div>
            <Label>{t('auth.password')}</Label>
            <PasswordField value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} autoComplete="new-password" />
          </div>
          <div>
            <Label>{t('auth.passwordConfirm')}</Label>
            <PasswordField value={confirm} onChange={(e) => setConfirm(e.target.value)} required minLength={8} autoComplete="new-password" />
          </div>
          {error ? <p className="text-sm text-red-500">{error}</p> : null}
          <Button type="submit" className="w-full" disabled={pending || !isSupabaseConfigured()}>
            {t('auth.resetSubmit')}
          </Button>
        </form>
      )}
      <Link to="/login" className="mt-4 block text-center text-sm text-[#d4af6a]">
        {t('auth.toLogin')}
      </Link>
    </div>
  )
}
