import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { supabase } from '../../lib/supabase'
import { formatDate } from '../../lib/format'
import type { TurnoverTask } from '../../types/database'

export function CleaningStatus({ reservationId }: { reservationId: string }) {
  const { t } = useTranslation()
  const { data: tasks = [] } = useQuery({
    queryKey: ['turnover-guest', reservationId],
    refetchInterval: 60_000,
    queryFn: async () => {
      if (!supabase) return []
      const { data, error } = await supabase
        .from('turnover_tasks')
        .select('*')
        .eq('reservation_id', reservationId)
        .order('due_on')
      if (error) return []
      return (data as TurnoverTask[]) ?? []
    },
  })
  if (tasks.length === 0) return null

  return (
    <div className="mt-6 border border-[#d4af6a]/30 p-4">
      <p className="font-display text-lg text-[#d4af6a]">{t('app.cleaningTitle')}</p>
      <ul className="mt-2 space-y-1 text-sm">
        {tasks.map((task) => (
          <li key={task.id} className="flex items-center justify-between gap-3">
            <span>{task.title}</span>
            <span className={task.done_at ? 'text-emerald-600' : 'theme-muted'}>
              {task.done_at ? t('app.cleaningDone') : `${t('app.cleaningPlanned')} ${formatDate(task.due_on)}${task.scheduled_time ? ` ${t('app.cleaningAt')} ${task.scheduled_time.slice(0, 5)}` : ''}`}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
