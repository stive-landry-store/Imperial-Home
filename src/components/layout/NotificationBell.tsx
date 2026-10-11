import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { createPortal } from 'react-dom'
import { Bell, X } from 'lucide-react'
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
      {open
        ? createPortal(
            <div className="fixed inset-0 z-[120]" data-bell-root>
              <button type="button" className="absolute inset-0 bg-black/60" aria-label={t('common.cancel')} onClick={() => setOpen(false)} />
              <div
                className="absolute inset-x-3 top-[max(0.75rem,env(safe-area-inset-top))] mx-auto flex max-h-[min(34rem,calc(100dvh-1.5rem-env(safe-area-inset-top)))] max-w-md flex-col overflow-hidden rounded-2xl border border-[#d4af6a]/60 bg-[#0b0b0c] text-[#f4eee3] shadow-[0_20px_60px_rgba(0,0,0,0.7)] md:inset-x-auto md:top-20 md:right-6 md:mx-0 md:w-[26rem]"
                role="dialog"
                aria-label={t('nav.notifications')}
              >
                <div className="flex items-center justify-between border-b border-[#d4af6a]/30 px-5 py-4">
                  <p className="text-base font-semibold tracking-[0.14em] uppercase text-[#d4af6a]">{t('nav.notifications')}</p>
                  <button type="button" className="grid h-10 w-10 place-items-center rounded-full text-[#d4af6a]" aria-label={t('common.cancel')} onClick={() => setOpen(false)}>
                    <X className="h-6 w-6" />
                  </button>
                </div>
                {!user ? (
                  <Link to="/login" className="block px-5 py-5 text-base" onClick={() => setOpen(false)}>
                    {t('nav.signInToSee')}
                  </Link>
                ) : data.length === 0 ? (
                  <p className="px-5 py-6 text-base text-white/70">{t('nav.noNotifications')}</p>
                ) : (
                  <ul className="min-h-0 flex-1 overflow-y-auto">
                    {data.map((item) => (
                      <li key={item.id} className={cn('border-b border-white/10 px-5 py-4', !item.read_at && 'bg-[#d4af6a]/12')}>
                        <p className="flex items-start gap-2 text-[17px] leading-snug font-semibold">
                          {!item.read_at ? <span className="mt-2 h-2.5 w-2.5 shrink-0 rounded-full bg-[#d4af6a]" /> : null}
                          <span>
                            <Live text={item.title} from="fr" />
                          </span>
                        </p>
                        {item.body ? (
                          <p className="mt-1 text-[16px] leading-snug text-white/80">
                            <Live text={item.body} from="fr" />
                          </p>
                        ) : null}
                        <div className="mt-3 flex gap-5 text-[13px] font-medium tracking-wider uppercase">
                          {item.link ? (
                            <Link
                              to={item.link}
                              className="inline-flex min-h-10 items-center text-[#d4af6a]"
                              onClick={() => {
                                if (!item.read_at) markRead.mutate(item.id)
                                setOpen(false)
                              }}
                            >
                              {t('account.openReservation')}
                            </Link>
                          ) : null}
                          {!item.read_at ? (
                            <button type="button" className="inline-flex min-h-10 items-center text-white/60" onClick={() => markRead.mutate(item.id)}>
                              {t('assistant.dismiss')}
                            </button>
                          ) : null}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>,
            document.body,
          )
        : null}
    </div>
  )
}
