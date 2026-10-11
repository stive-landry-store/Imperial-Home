import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useQueryClient } from '@tanstack/react-query'
import { Button } from '../ui/Button'
import { scheduleCleaning } from '../../lib/guest'
import { todayIso } from '../../lib/availability'

export function CleaningNotice({
  reservationId,
  taskId,
  defaultDate,
  defaultTime,
  compact,
}: {
  reservationId: string
  taskId?: string
  defaultDate?: string
  defaultTime?: string | null
  compact?: boolean
}) {
  const { t } = useTranslation()
  const client = useQueryClient()
  const [date, setDate] = useState(defaultDate || todayIso())
  const [time, setTime] = useState(defaultTime?.slice(0, 5) || '10:00')
  const [note, setNote] = useState('')
  const [state, setState] = useState<'idle' | 'busy' | 'sent' | 'error'>('idle')
  const [error, setError] = useState('')

  return (
    <form
      className={compact ? 'mt-3 space-y-2' : 'theme-card mt-8 max-w-xl space-y-3 p-5'}
      onSubmit={(event) => {
        event.preventDefault()
        setState('busy')
        scheduleCleaning({ reservationId, taskId, date, time, note })
          .then(() => {
            setState('sent')
            void client.invalidateQueries({ queryKey: ['turnover'] })
            void client.invalidateQueries({ queryKey: ['turnover-guest'] })
          })
          .catch((err: Error) => {
            setError(err.message)
            setState('error')
          })
      }}
    >
      {compact ? null : <h2 className="font-display text-2xl">{t('app.cleaningNoticeTitle')}</h2>}
      <p className="text-sm theme-muted">{t('app.cleaningNoticeLead')}</p>
      <div className="flex flex-wrap gap-3">
        <label className="text-xs tracking-wider uppercase">
          {t('app.cleaningDate')}
          <input type="date" required min={todayIso()} value={date} onChange={(e) => setDate(e.target.value)} className="mt-1 block min-h-11 border border-line bg-transparent px-3" />
        </label>
        <label className="text-xs tracking-wider uppercase">
          {t('app.cleaningTime')}
          <input type="time" required value={time} onChange={(e) => setTime(e.target.value)} className="mt-1 block min-h-11 border border-line bg-transparent px-3" />
        </label>
      </div>
      <input
        value={note}
        onChange={(e) => setNote(e.target.value)}
        maxLength={160}
        placeholder={t('app.cleaningNote')}
        className="min-h-11 w-full border border-line bg-transparent px-3 text-sm"
      />
      <Button type="submit" disabled={state === 'busy'}>
        {state === 'busy' ? '…' : t('app.cleaningSend')}
      </Button>
      {state === 'sent' ? <p className="text-sm text-emerald-700">{t('app.cleaningSent')}</p> : null}
      {state === 'error' ? <p className="text-sm text-red-600">{error}</p> : null}
    </form>
  )
}
