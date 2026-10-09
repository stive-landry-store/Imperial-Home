import { useState, type FormEvent } from 'react'
import { Helmet } from 'react-helmet-async'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Button } from '../../components/ui/Button'
import { Input, Label } from '../../components/ui/Field'
import { PasswordField } from '../../components/ui/PasswordField'
import { useAuth } from '../../hooks/useAuth'
import { useTheme } from '../../hooks/useTheme'
import { formatLoginRegisterError } from '../../lib/authMessages'
import { isSupabaseConfigured } from '../../lib/supabase'
import { ImperialLogo } from '../../components/brand/Logo'

export function AuthPage({ mode }: { mode: 'login' | 'register' }) {
  const { t } = useTranslation()
  const { theme } = useTheme()
  const { signIn, signUp } = useAuth()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const requested = params.get('next')
  const next = !requested || requested.startsWith('/account/profile') ? '/' : requested
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (mode === 'register' && password !== confirm) {
      setError(t('auth.passwordMismatch'))
      return
    }
    setPending(true)
    setError(null)
    try {
      if (mode === 'login') {
        await signIn(email, password)
        navigate(next)
      } else {
        await signUp({ email, password, full_name: fullName, phone })
        navigate('/')
      }
    } catch (err) {
      setError(formatLoginRegisterError(err, t, mode))
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="theme-page mx-auto max-w-md px-4 pt-36 pb-20">
      <Helmet>
        <title>{mode === 'login' ? t('auth.loginTitle') : t('auth.registerTitle')} | Imperial Home</title>
      </Helmet>
      <ImperialLogo compact light={theme === 'dark'} />
      <h1 className="mt-8 font-display text-4xl">{mode === 'login' ? t('auth.loginTitle') : t('auth.registerTitle')}</h1>
      {!isSupabaseConfigured() ? <p className="mt-4 text-sm text-[#d4af6a]">{t('auth.configure')}</p> : null}
      <form className="theme-card mt-8 space-y-4 p-6" onSubmit={(e) => void onSubmit(e)}>
        {mode === 'register' ? (
          <>
            <div>
              <Label>{t('auth.name')}</Label>
              <Input value={fullName} onChange={(e) => setFullName(e.target.value)} required />
            </div>
            <div>
              <Label>{t('auth.phone')}</Label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
          </>
        ) : null}
        <div>
          <Label>{t('auth.email')}</Label>
          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
        </div>
        <div>
          <Label>{t('auth.password')}</Label>
          <PasswordField
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
          />
        </div>
        {mode === 'register' ? (
          <div>
            <Label>{t('auth.passwordConfirm')}</Label>
            <PasswordField
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
              minLength={8}
              autoComplete="new-password"
            />
          </div>
        ) : null}
        {error ? <p className="text-sm text-red-500">{error}</p> : null}
        <Button type="submit" className="w-full" disabled={pending || !isSupabaseConfigured()}>
          {mode === 'login' ? t('auth.submitLogin') : t('auth.submitRegister')}
        </Button>
      </form>
      {mode === 'login' ? (
        <Link to="/forgot-password" className="mt-4 block text-center text-sm text-[#d4af6a]">
          {t('auth.forgot')}
        </Link>
      ) : null}
      <Link
        to={mode === 'login' ? `/register?next=${encodeURIComponent(next)}` : `/login?next=${encodeURIComponent(next)}`}
        className="mt-3 block text-center text-sm text-[#d4af6a]"
      >
        {mode === 'login' ? t('auth.toRegister') : t('auth.toLogin')}
      </Link>
    </div>
  )
}
