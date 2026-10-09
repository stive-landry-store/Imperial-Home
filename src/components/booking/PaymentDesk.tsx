import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useQueryClient } from '@tanstack/react-query'
import { Button } from '../ui/Button'
import { Input, Label } from '../ui/Field'
import { submitReceipt } from '../../lib/guest'
import { formatXaf } from '../../lib/format'
import type { Reservation } from '../../types/database'

export function PaymentDesk({
  reservation,
  merchantPhone,
}: {
  reservation: Reservation
  merchantPhone: string
}) {
  const { t } = useTranslation()
  const client = useQueryClient()
  const [provider, setProvider] = useState<'mtn_momo' | 'orange_money'>('mtn_momo')
  const [phone, setPhone] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)
  const [pending, setPending] = useState(false)
  const amount = reservation.payments?.[0]?.amount_xaf ?? reservation.total_amount_xaf

  async function send() {
    if (!file) return
    setPending(true)
    setError(null)
    try {
      await submitReceipt(reservation.id, provider, phone, file)
      setDone(true)
      await client.invalidateQueries({ queryKey: ['reservation', reservation.id] })
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t('common.error'))
    } finally {
      setPending(false)
    }
  }

  if (done || reservation.status === 'payment_processing') {
    return <p className="mt-4 text-sm text-emerald-700">{t('plus.receiptOk')}</p>
  }

  return (
    <div className="mt-6 space-y-4">
      <p className="text-sm">{t('plus.paySteps')}</p>
      <p className="text-lg">{formatXaf(amount)}</p>
      <p className="text-sm">
        {t('plus.payTo')} <span className="text-[#d4af6a]">{merchantPhone}</span>
      </p>
      <p className="text-sm">
        {t('plus.payRef')} : <span className="font-medium">{reservation.public_code}</span>
      </p>
      <div className="grid gap-2">
        {(['mtn_momo', 'orange_money'] as const).map((item) => (
          <button
            key={item}
            type="button"
            className={`min-h-12 w-full border px-3 py-3 text-base ${provider === item ? 'border-[#d4af6a] text-[#d4af6a]' : 'border-line'}`}
            onClick={() => setProvider(item)}
          >
            {item === 'mtn_momo' ? t('plus.mtn') : t('plus.orange')}
          </button>
        ))}
      </div>
      <div>
        <Label>{t('plus.payerPhone')}</Label>
        <Input value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" required placeholder="6XXXXXXXX" />
      </div>
      <div>
        <Label>{t('plus.receipt')}</Label>
        <input
          type="file"
          accept="image/*,.pdf"
          className="mt-1 block w-full text-sm"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        />
      </div>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      <Button disabled={pending || !file || phone.trim().length < 8} onClick={() => void send()}>
        {t('plus.sendReceiptFile')}
      </Button>
    </div>
  )
}
