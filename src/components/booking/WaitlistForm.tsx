import { useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '../ui/Button'
import { Input, Label } from '../ui/Field'
import { joinWaitlist } from '../../lib/guest'
import { useAuth } from '../../hooks/useAuth'

export function WaitlistForm({
  propertyId,
  checkIn,
  checkOut,
  guests,
}: {
  propertyId: string
  checkIn: string
  checkOut: string
  guests: number
}) {
  const { t } = useTranslation()
  const { user, profile } = useAuth()
  const [email, setEmail] = useState(profile?.email ?? '')
  const [phone, setPhone] = useState(profile?.phone ?? '')
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    try {
      await joinWaitlist({
        propertyId,
        customerId: user?.id,
        fullName: profile?.full_name ?? '',
        email,
        phone,
        checkIn,
        checkOut,
        guests,
      })
      setDone(true)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t('common.error'))
    }
  }

  if (done) return <p className="mt-3 text-sm text-emerald-700">{t('plus.waitlistOk')}</p>

  return (
    <form className="mt-4 space-y-3" onSubmit={(event) => void submit(event)}>
      <p className="text-sm">{t('plus.waitlistLead')}</p>
      <div>
        <Label>{t('auth.email')}</Label>
        <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
      </div>
      <div>
        <Label>{t('plus.payerPhone')}</Label>
        <Input value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" />
      </div>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      <Button type="submit">{t('plus.waitlist')}</Button>
    </form>
  )
}
