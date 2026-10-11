import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Helmet } from 'react-helmet-async'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { fetchTurnover, fetchWaitlist, setTurnoverDone } from '../../lib/guest'
import { formatDate } from '../../lib/format'
import { useState } from 'react'
import { Button } from '../../components/ui/Button'
import { CleaningNotice } from '../../components/admin/CleaningNotice'

export function AdminTurnoverPage() {
  const { t } = useTranslation()
  const client = useQueryClient()
  const [openId, setOpenId] = useState<string | null>(null)
  const { data: tasks = [] } = useQuery({ queryKey: ['turnover'], queryFn: fetchTurnover })
  const { data: waiting = [] } = useQuery({ queryKey: ['waitlist'], queryFn: fetchWaitlist })
  const toggle = useMutation({
    mutationFn: ({ id, done }: { id: string; done: boolean }) => setTurnoverDone(id, done),
    onSuccess: () => void client.invalidateQueries({ queryKey: ['turnover'] }),
  })

  return (
    <div className="px-4 py-5 md:p-10">
      <Helmet>
        <title>{t('admin.turnover')} | Imperial Home</title>
      </Helmet>
      <h1 className="font-display text-4xl">{t('admin.turnover')}</h1>
      <p className="mt-2 text-sm theme-muted">{t('plus.turnoverLead')}</p>
      <ul className="surface-light mt-6 divide-y divide-line border border-line">
        {tasks.map((task) => (
          <li key={task.id} className="px-4 py-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className={task.done_at ? 'line-through opacity-60' : ''}>{task.title}</p>
                <p className="text-sm theme-muted">
                  {task.properties?.name} · {task.reservations?.public_code} · {formatDate(task.due_on)}
                  {task.scheduled_time ? ` ${t('app.cleaningAt')} ${task.scheduled_time.slice(0, 5)}` : ''}
                </p>
                {task.notified_at ? <p className="text-xs text-emerald-700">{t('app.cleaningNotified')}</p> : null}
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" className="px-3 py-2 text-[11px]" onClick={() => setOpenId(openId === task.id ? null : task.id)}>
                  {t('app.cleaningNotify')}
                </Button>
                <Button
                  variant={task.done_at ? 'outline' : 'primary'}
                  className="px-4 py-3 text-[11px]"
                  onClick={() => toggle.mutate({ id: task.id, done: !task.done_at })}
                >
                  {task.done_at ? t('plus.undo') : t('app.cleaningReady')}
                </Button>
              </div>
            </div>
            {openId === task.id ? (
              <CleaningNotice compact reservationId={task.reservation_id} taskId={task.id} defaultDate={task.due_on} defaultTime={task.scheduled_time} />
            ) : null}
          </li>
        ))}
        {tasks.length === 0 ? <li className="px-4 py-6 text-sm theme-muted">{t('admin.noPending')}</li> : null}
      </ul>

      <h2 className="mt-12 font-display text-3xl">{t('plus.waitlistAdmin')}</h2>
      <ul className="mt-4 space-y-3">
        {waiting.map((entry) => (
          <li key={entry.id} className="border border-line px-4 py-3 text-sm">
            <p>
              {entry.properties?.name} · {formatDate(entry.check_in)} → {formatDate(entry.check_out)}
            </p>
            <p className="theme-muted">
              {entry.full_name} · {entry.email} {entry.phone ? `· ${entry.phone}` : ''}
            </p>
          </li>
        ))}
      </ul>
      <p className="mt-6 text-sm">
        <Link to="/admin/reviews" className="text-[#d4af6a]">
          {t('admin.reviewsAdmin')}
        </Link>
      </p>
    </div>
  )
}
