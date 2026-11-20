import { useEffect, useState, type FormEvent } from 'react'
import { Helmet } from 'react-helmet-async'
import { useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { KeyRound, ShieldCheck, Smartphone, Trash2 } from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { Input, Label } from '../../components/ui/Field'
import { useAuth } from '../../hooks/useAuth'
import { supabase } from '../../lib/supabase'
import { readMfaState, verifyTotp } from '../../lib/mfa'

// Imperial Home — administrator security: authenticator app (TOTP) and house-wide 2FA policy.
// Conçu par stive landry store (NYAMI TCHOUPE STIVE LANDRY).

type Factor = { id: string; friendly_name?: string | null; status: string; created_at: string }
type Enrolling = { id: string; qr: string; secret: string }

export function AdminSecurityPage() {
  const { t } = useTranslation()
  const { profile } = useAuth()
  const [params] = useSearchParams()
  const [factors, setFactors] = useState<Factor[]>([])
  const [required, setRequired] = useState(false)
  const [enrolling, setEnrolling] = useState<Enrolling | null>(null)
  const [code, setCode] = useState('')
  const [notice, setNotice] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [version, setVersion] = useState(0)
  const isSuper = profile?.role === 'super_admin' || profile?.role === 'main_admin'

  useEffect(() => {
    if (!supabase) return
    const client = supabase
    let cancelled = false
    void Promise.all([client.auth.mfa.listFactors(), readMfaState()]).then(([listed, state]) => {
      if (cancelled) return
      setFactors((listed.data?.totp ?? []) as Factor[])
      setRequired(state.required)
    })
    return () => {
      cancelled = true
    }
  }, [version])

  async function startEnroll() {
    if (!supabase) return
    setError(null)
    const { data, error: enrollError } = await supabase.auth.mfa.enroll({
      factorType: 'totp',
      friendlyName: `Imperial Home ${new Date().toISOString().slice(0, 10)}`,
    })
    if (enrollError || !data) {
      setError(enrollError?.message ?? t('security.error'))
      return
    }
    setEnrolling({ id: data.id, qr: data.totp.qr_code, secret: data.totp.secret })
  }

  async function confirmEnroll(event: FormEvent) {
    event.preventDefault()
    if (!enrolling) return
    try {
      await verifyTotp(code, enrolling.id)
      setEnrolling(null)
      setCode('')
      setNotice(t('security.enabled'))
      setVersion((v) => v + 1)
    } catch {
      setError(t('security.wrongCode'))
    }
  }

  async function remove(id: string) {
    if (!supabase) return
    const { error: removeError } = await supabase.auth.mfa.unenroll({ factorId: id })
    if (removeError) setError(removeError.message)
    setVersion((v) => v + 1)
  }

  async function togglePolicy(next: boolean) {
    if (!supabase) return
    const { error: saveError } = await supabase.from('system_config').upsert({ key: 'require_admin_mfa', value: next })
    if (saveError) setError(saveError.message)
    else setRequired(next)
  }

  const verified = factors.filter((f) => f.status === 'verified')

  return (
    <div className="mx-auto max-w-2xl space-y-8 px-4 py-5 md:p-10">
      <Helmet>
        <title>{`${t('security.title')} | Imperial Home`}</title>
      </Helmet>
      <header className="space-y-1">
        <h1 className="font-display text-3xl">{t('security.title')}</h1>
        <p className="theme-muted">{t('security.lead')}</p>
      </header>

      {params.get('required') === '1' && !verified.length ? (
        <p className="ih-pop rounded-2xl border border-[#d4af6a]/50 p-4 text-sm text-[#d4af6a]">{t('security.requiredNotice')}</p>
      ) : null}
      {notice ? <p className="ih-pop rounded-2xl border border-emerald-500/40 p-4 text-sm text-emerald-400">{notice}</p> : null}
      {error ? <p className="ih-shake text-sm text-red-500" role="alert">{error}</p> : null}

      <section className="theme-card space-y-4 rounded-3xl p-6">
        <h2 className="flex items-center gap-2 text-xl font-semibold">
          <Smartphone className="h-5 w-5 text-[#d4af6a]" /> {t('security.appTitle')}
        </h2>
        <p className="text-sm theme-muted">{t('security.appLead')}</p>
        {verified.length ? (
          <ul className="space-y-2">
            {verified.map((f) => (
              <li key={f.id} className="flex items-center justify-between rounded-2xl border border-white/10 px-4 py-3">
                <span className="flex items-center gap-2 text-sm">
                  <ShieldCheck className="h-4 w-4 text-emerald-400" /> {f.friendly_name || 'TOTP'}
                </span>
                <button type="button" className="ih-btn rounded-full p-2 text-red-400" aria-label={t('security.remove')} onClick={() => void remove(f.id)}>
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        ) : null}
        {enrolling ? (
          <form onSubmit={(e) => void confirmEnroll(e)} className="ih-scale-in space-y-4">
            <img src={enrolling.qr} alt={t('security.qrAlt')} className="mx-auto h-48 w-48 rounded-2xl bg-white p-2" />
            <p className="text-center text-xs break-all theme-muted">{enrolling.secret}</p>
            <div>
              <Label>{t('security.code')}</Label>
              <Input
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                className="text-center text-xl tracking-[0.4em]"
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={code.length !== 6}>
              {t('security.verify')}
            </Button>
          </form>
        ) : (
          <Button onClick={() => void startEnroll()}>
            <KeyRound className="h-4 w-4" /> {verified.length ? t('security.addAnother') : t('security.enable')}
          </Button>
        )}
      </section>

      {isSuper ? (
        <section className="theme-card space-y-3 rounded-3xl p-6">
          <h2 className="text-xl font-semibold">{t('security.policyTitle')}</h2>
          <p className="text-sm theme-muted">{t('security.policyLead')}</p>
          <label className="flex items-center gap-3 text-sm">
            <input type="checkbox" checked={required} onChange={(e) => void togglePolicy(e.target.checked)} className="h-5 w-5 accent-[#c4a35a]" />
            {t('security.policyToggle')}
          </label>
        </section>
      ) : null}
    </div>
  )
}
