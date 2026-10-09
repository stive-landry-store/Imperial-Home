import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Bell } from 'lucide-react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { fetchMyNotifications, markNotificationRead } from '../../lib/data'
import { useAuth } from '../../hooks/useAuth'
import { Live } from '../i18n/Live'
import { cn } from '../../lib/cn'

export function NotificationBell() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const [open, setOpen] = useState(false)
  const client = useQueryClient()
  const { data = [] } = useQuery({
    queryKey: ['notifications', user?.id],
    queryFn: fetchMyNotifications,
    enabled: Boolean(user),
  })
  const markRead = useMutation({
    mutationFn: markNotificationRead,
    onSuccess: () => void client.invalidateQueries({ queryKey: ['notifications'] }),
  })
  const unread = data.filter((item) => !item.read_at).length

  useEffect(() => {
    if (!open) return
    const close = (event: MouseEvent) => {
      const target = event.target
      if (target instanceof Element && target.closest('[data-bell-root]')) return
      setOpen(false)
    }
    window.addEventListener('click', close)
    return () => window.removeEventListener('click', close)
  }, [open])

  return (
    <div className="relative" data-bell-root>
      <button
        type="button"
        className="relative inline-flex min-h-11 min-w-11 items-center justify-center touch-manipulation"
        aria-label={t('nav.notifications')}
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <Bell className="h-5 w-5" />
        {unread > 0 ? (
          <span className="absolute top-1 right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#1d9bf0] px-1 text-[10px] text-white">
            {unread > 9 ? '9+' : unread}
          </span>
        ) : null}
      </button>
      {open ? (
        <div className="absolute right-0 z-[70] mt-2 w-[min(22rem,calc(100vw-2rem))] border border-[#d4af6a]/40 bg-black text-[#f4eee3] shadow-2xl">
          <p className="border-b border-[#d4af6a]/25 px-4 py-3 text-sm tracking-[0.16em] uppercase">{t('nav.notifications')}</p>
          {!user ? (
            <Link to="/login" className="block px-4 py-4 text-sm" onClick={() => setOpen(false)}>
              {t('nav.signInToSee')}
            </Link>
          ) : data.length === 0 ? (
            <p className="px-4 py-4 text-sm text-white/70">{t('nav.noNotifications')}</p>
          ) : (
            <ul className="max-h-80 overflow-y-auto">
              {data.map((item) => (
                <li key={item.id} className={cn('border-b border-white/10 px-4 py-3', !item.read_at && 'bg-[#d4af6a]/10')}>
                  <p className="text-sm font-medium">
                    <Live text={item.title} from="fr" />
                  </p>
                  {item.body ? (
                    <p className="mt-1 text-sm text-white/75">
                      <Live text={item.body} from="fr" />
                    </p>
                  ) : null}
                  <div className="mt-2 flex gap-3 text-xs tracking-wider uppercase">
                    {item.link ? (
                      <Link
                        to={item.link}
                        className="text-[#d4af6a]"
                        onClick={() => {
                          if (!item.read_at) markRead.mutate(item.id)
                          setOpen(false)
                        }}
                      >
                        {t('account.openReservation')}
                      </Link>
                    ) : null}
                    {!item.read_at ? (
                      <button type="button" className="text-white/60" onClick={() => markRead.mutate(item.id)}>
                        {t('assistant.dismiss')}
                      </button>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  )
}
