import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { fetchMyNotifications, markNotificationRead } from '../../lib/data'
import { useAuth } from '../../hooks/useAuth'

export function CustomerNotifications() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const client = useQueryClient()
  const { data = [] } = useQuery({
    queryKey: ['notifications'],
    queryFn: fetchMyNotifications,
    enabled: Boolean(user),
  })
  const markRead = useMutation({
    mutationFn: markNotificationRead,
    onSuccess: () => void client.invalidateQueries({ queryKey: ['notifications'] }),
  })

  const unread = data.filter((n) => !n.read_at)
  if (unread.length === 0) return null

  return (
    <ul className="mb-6 space-y-2" aria-live="polite">
      {unread.map((n) => (
        <li key={n.id} className="border border-[#d4af6a]/50 bg-[#d4af6a]/10 px-4 py-3">
          <p className="font-medium text-[#c4a35a]">{n.title}</p>
          {n.body ? <p className="mt-1 text-sm">{n.body}</p> : null}
          <div className="mt-2 flex flex-wrap gap-3 text-xs uppercase tracking-wider">
            {n.link ? (
              <Link
                to={n.link}
                className="text-gold"
                onClick={() => markRead.mutate(n.id)}
              >
                {t('account.openReservation')}
              </Link>
            ) : null}
            <button type="button" className="text-muted" onClick={() => markRead.mutate(n.id)}>
              {t('assistant.dismiss')}
            </button>
          </div>
        </li>
      ))}
    </ul>
  )
}
