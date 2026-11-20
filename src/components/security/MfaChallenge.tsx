import { useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { ShieldCheck } from 'lucide-react'
import { Button } from '../ui/Button'
import { Input } from '../ui/Field'
import { verifyTotp } from '../../lib/mfa'

export function MfaChallenge({ onDone }: { onDone: () => void }) {
  const { t } = useTranslation()
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function submit(event: FormEvent) {
    event.preventDefault()
    setBusy(true)
    setError(null)
    try {
      await verifyTotp(code)
      onDone()
    } catch {
      setError(t('security.wrongCode'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="theme-page flex min-h-[70svh] items-center justify-center p-6">
      <form onSubmit={(e) => void submit(e)} className="ih-pop theme-card w-full max-w-sm space-y-4 rounded-3xl p-6 text-center">
        <ShieldCheck className="ih-float mx-auto h-10 w-10 text-[#d4af6a]" />
        <h1 className="font-display text-2xl">{t('security.challengeTitle')}</h1>
        <p className="text-sm theme-muted">{t('security.challengeLead')}</p>
        <Input
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="[0-9]{6}"
          maxLength={6}
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
          className="text-center text-2xl tracking-[0.5em]"
          autoFocus
          required
        />
        {error ? <p className="ih-shake text-sm text-red-500" role="alert">{error}</p> : null}
        <Button type="submit" className="w-full" disabled={busy || code.length !== 6}>
          {t('security.verify')}
        </Button>
      </form>
    </div>
  )
}
