import { useState, type FormEvent } from 'react'
import { useOnline } from '../../hooks/useOnline'
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
import { Turnstile } from '../../components/security/Turnstile'
import { captchaEnabled } from '../../lib/captcha'

/** Only same-site paths: refuses "//other.site", "/\other.site", full URLs and control characters (open-redirect guard). */
function safeNext(value: string) {
  if (!value.startsWith('/') || value.startsWith('//') || value.startsWith('/\\')) return '/'
  if ([...value].some((c) => c.charCodeAt(0) < 32 || c.charCodeAt(0) === 127)) return '/'
  return value
}

export function AuthPage({ mode }: { mode: 'login' | 'register' }) {
  const { t, i18n } = useTranslation()
  const [params] = useSearchParams()
  const online = useOnline()
  const { theme } = useTheme()
  const { signIn, signUp } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const [captcha, setCaptcha] = useState<string | null>(null)
  const [sent, setSent] = useState(false)
  const next = params.get('next') || '/'
  const confirmed = params.get('confirmed') === '1'

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
        navigate(safeNext(next), { replace: true })
      } else {
        if (captchaEnabled && !captcha) {
          setError(t('auth.captchaRequired'))
          return
        }
        await signUp({ email, password, full_name: fullName, phone, captchaToken: captcha, locale: i18n.language })
        setSent(true)
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
        <title>{`${mode === 'login' ? t('auth.loginTitle') : t('auth.registerTitle')} | Imperial Home`}</title>
      </Helmet>
      <ImperialLogo compact light={theme === 'dark'} />
      <h1 className="mt-8 font-display text-4xl">{mode === 'login' ? t('auth.loginTitle') : t('auth.registerTitle')}</h1>
      {!isSupabaseConfigured() ? <p className="mt-4 text-sm text-accent">{t('auth.configure')}</p> : null}
      {confirmed && mode === 'login' ? (
        <p className="ih-pop mt-4 rounded-2xl border border-accent/40 p-4 text-sm text-accent">{t('auth.emailConfirmed')}</p>
      ) : null}
      {sent ? (
        <div className="ih-pop theme-card mt-8 space-y-3 p-6 text-center" role="status">
          <p className="ih-float text-4xl" aria-hidden>✉︎</p>
          <p className="font-display text-xl">{t('auth.confirmEmailSent')}</p>
          <p className="text-sm theme-muted">{email}</p>
          <Link to="/login" className="mt-2 inline-block text-sm text-accent">{t('auth.toLogin')}</Link>
        </div>
      ) : (
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
        {mode === 'register' ? <Turnstile onToken={setCaptcha} theme={theme === 'dark' ? 'dark' : 'light'} /> : null}
        {error ? <p className="ih-shake text-sm text-red-500" role="alert">{error}</p> : null}
        {!online ? <p className="text-sm text-accent">{t('app.offlineNoBooking')}</p> : null}
        <Button type="submit" className="w-full" disabled={!online || pending || !isSupabaseConfigured()}>
          {mode === 'login' ? t('auth.submitLogin') : t('auth.submitRegister')}
        </Button>
      </form>
      )}
      {mode === 'login' ? (
        <Link to="/forgot-password" className="mt-4 block text-center text-sm text-accent">
          {t('auth.forgot')}
        </Link>
      ) : null}
      <Link
        to={mode === 'login' ? '/register' : '/login'}
        className="mt-3 block text-center text-sm text-accent"
      >
        {mode === 'login' ? t('auth.toRegister') : t('auth.toLogin')}
      </Link>
    </div>
  )
}
