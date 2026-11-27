import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { createPortal } from 'react-dom'
import { Bell, BellRing, CalendarCheck, CheckCheck, CreditCard, LifeBuoy, MessageCircle, Sparkles, X, type LucideIcon } from 'lucide-react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { fetchMyNotifications, markNotificationRead } from '../../lib/data'
import { useAuth } from '../../hooks/useAuth'
import { Live } from '../i18n/Live'
import { cn } from '../../lib/cn'
import type { AppNotification } from '../../types/database'

/** Picks an icon and a tint from what the notification is about. */
function kindOf(item: AppNotification): { icon: LucideIcon; tone: string } {
  const text = `${item.title} ${item.link ?? ''}`.toLowerCase()
  if (/paiement|payment|reçu|receipt/.test(text)) return { icon: CreditCard, tone: 'ih-notif-tone-pay' }
  if (/assistance|human|aide/.test(text)) return { icon: LifeBuoy, tone: 'ih-notif-tone-help' }
  if (/chat|message|discussion/.test(text)) return { icon: MessageCircle, tone: 'ih-notif-tone-chat' }
  if (/réservation|reservation|séjour|stay/.test(text)) return { icon: CalendarCheck, tone: 'ih-notif-tone-stay' }
  return { icon: Sparkles, tone: 'ih-notif-tone-info' }
}

function timeAgo(iso: string, lang: string) {
  const seconds = Math.round((Date.parse(iso) - Date.now()) / 1000)
  if (!Number.isFinite(seconds)) return ''
  const rtf = new Intl.RelativeTimeFormat(lang, { numeric: 'auto', style: 'short' })
  const steps: [Intl.RelativeTimeFormatUnit, number][] = [
    ['year', 31_536_000],
    ['month', 2_592_000],
    ['week', 604_800],
    ['day', 86_400],
    ['hour', 3_600],
    ['minute', 60],
  ]
  for (const [unit, size] of steps) {
    if (Math.abs(seconds) >= size) return rtf.format(Math.round(seconds / size), unit)
  }
  return rtf.format(0, 'minute')
}

export function NotificationBell() {
  const { t, i18n } = useTranslation()
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
  const unreadItems = data.filter((item) => !item.read_at)
  const unread = unreadItems.length
  const markAll = useMutation({
    mutationFn: () => Promise.all(unreadItems.map((item) => markNotificationRead(item.id))),
    onSuccess: () => void client.invalidateQueries({ queryKey: ['notifications'] }),
  })

  useEffect(() => {
    if (!open) return
    const close = (event: MouseEvent) => {
      const target = event.target
      if (target instanceof Element && target.closest('[data-bell-root]')) return
      setOpen(false)
    }
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    window.addEventListener('click', close)
    window.addEventListener('keydown', escape)
    return () => {
      window.removeEventListener('click', close)
      window.removeEventListener('keydown', escape)
    }
  }, [open])

  return (
    <div className="relative" data-bell-root>
      <button
        type="button"
        className={cn('ih-bell relative inline-flex min-h-11 min-w-11 items-center justify-center touch-manipulation', unread > 0 && 'has-unread')}
        aria-label={t('nav.notifications')}
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <Bell className="ih-bell-icon h-5 w-5" />
        {unread > 0 ? (
          <span key={unread} className="ih-bell-badge absolute top-1 right-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full px-1 text-[10px] font-bold text-white">
            {unread > 9 ? '9+' : unread}
          </span>
        ) : null}
      </button>
      {open
        ? createPortal(
            <div className="fixed inset-0 z-[120]" data-bell-root>
              <button type="button" className="ih-notif-veil absolute inset-0" aria-label={t('common.cancel')} onClick={() => setOpen(false)} />
              <div
                className="ih-notif-panel absolute inset-x-3 top-[max(0.75rem,env(safe-area-inset-top))] mx-auto flex max-h-[min(38rem,calc(100dvh-1.5rem-env(safe-area-inset-top)))] max-w-md flex-col overflow-hidden rounded-[1.75rem] text-panel-fg md:inset-x-auto md:top-20 md:right-6 md:mx-0 md:w-[27rem]"
                role="dialog"
                aria-label={t('nav.notifications')}
              >
                <div className="ih-notif-head relative shrink-0 overflow-hidden px-5 pt-5 pb-4">
                  <div className="ih-notif-head-glow" aria-hidden />
                  <div className="relative flex items-center gap-3">
                    <span className="ih-notif-bell grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-accent-soft text-accent">
                      <BellRing className="h-6 w-6" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="font-display text-2xl leading-tight font-medium">{t('app.notifTitle')}</p>
                      <p className="text-[13px] theme-muted">
                        {unread > 0 ? (
                          <span className="font-semibold text-accent">
                            {unread} {t('app.notifUnread')}
                          </span>
                        ) : (
                          t('app.notifEmpty')
                        )}
                      </p>
                    </div>
                    <button
                      type="button"
                      className="ih-btn grid h-10 w-10 shrink-0 place-items-center rounded-full border border-line hover:bg-accent-soft"
                      aria-label={t('common.cancel')}
                      onClick={() => setOpen(false)}
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                  {unread > 1 ? (
                    <button
                      type="button"
                      className="ih-btn relative mt-4 inline-flex min-h-9 items-center gap-2 rounded-full bg-accent-soft px-3.5 text-[13px] font-semibold text-accent disabled:opacity-60"
                      disabled={markAll.isPending}
                      onClick={() => markAll.mutate()}
                    >
                      <CheckCheck className="h-4 w-4" />
                      {t('app.notifReadAll')}
                    </button>
                  ) : null}
                </div>
                {!user ? (
                  <Link to="/login" className="mx-4 mb-4 block rounded-2xl bg-accent-soft px-5 py-5 text-base font-medium text-accent" onClick={() => setOpen(false)}>
                    {t('nav.signInToSee')}
                  </Link>
                ) : data.length === 0 ? (
                  <div className="ih-notif-empty flex flex-col items-center px-6 pt-4 pb-10 text-center">
                    <span className="ih-notif-empty-ring grid h-20 w-20 place-items-center rounded-full bg-accent-soft text-accent">
                      <CheckCheck className="h-9 w-9" />
                    </span>
                    <p className="mt-4 font-display text-xl">{t('app.notifEmpty')}</p>
                    <p className="mt-1 text-sm theme-muted">{t('nav.noNotifications')}</p>
                  </div>
                ) : (
                  <ul className="ih-notif-list min-h-0 flex-1 space-y-2 overflow-y-auto px-3 pb-3">
                    {data.map((item, index) => {
                      const { icon: Icon, tone } = kindOf(item)
                      const fresh = !item.read_at
                      return (
                        <li
                          key={item.id}
                          className={cn('ih-notif-item relative overflow-hidden rounded-2xl border p-4', fresh ? 'is-unread border-accent/25' : 'border-line')}
                          style={{ ['--ih-i' as string]: Math.min(index, 10) }}
                        >
                          <div className="flex items-start gap-3">
                            <span className={cn('ih-notif-icon grid h-10 w-10 shrink-0 place-items-center rounded-xl', tone)}>
                              <Icon className="h-5 w-5" />
                            </span>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-start justify-between gap-2">
                                <p className="text-[15px] leading-snug font-semibold">
                                  <Live text={item.title} from="fr" />
                                </p>
                                <span className="mt-0.5 shrink-0 text-[11px] theme-muted-soft">{timeAgo(item.created_at, i18n.language)}</span>
                              </div>
                              {item.body ? (
                                <p className="mt-1 text-[14px] leading-snug theme-muted">
                                  <Live text={item.body} from="fr" />
                                </p>
                              ) : null}
                              {item.link || fresh ? (
                                <div className="mt-3 flex flex-wrap gap-2 text-[13px] font-semibold">
                                  {item.link ? (
                                    <Link
                                      to={item.link}
                                      className="ih-btn ih-btn-primary inline-flex min-h-9 items-center rounded-full px-4"
                                      onClick={() => {
                                        if (fresh) markRead.mutate(item.id)
                                        setOpen(false)
                                      }}
                                    >
                                      {t('account.openReservation')}
                                    </Link>
                                  ) : null}
                                  {fresh ? (
                                    <button
                                      type="button"
                                      className="ih-btn inline-flex min-h-9 items-center rounded-full border border-line px-4 theme-muted hover:bg-accent-soft"
                                      onClick={() => markRead.mutate(item.id)}
                                    >
                                      {t('assistant.dismiss')}
                                    </button>
                                  ) : null}
                                </div>
                              ) : null}
                            </div>
                          </div>
                        </li>
                      )
                    })}
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
