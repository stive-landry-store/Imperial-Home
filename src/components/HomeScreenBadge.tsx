import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../hooks/useAuth'
import { useUnreadChat } from '../hooks/useUnreadChat'
import { badgeHoldActive, paintBadge, showLockScreenNotice, storedBadge } from '../lib/systemNotifications'

/** Red number on the phone's home-screen icon, same count as the messages in the app. */
export function HomeScreenBadge() {
  const { t } = useTranslation()
  const { user, isStaff } = useAuth()
  const { count, ready } = useUnreadChat()
  const [held, setHeld] = useState(() => badgeHoldActive())
  const announced = useRef<number | null>(null)
  const link = isStaff ? '/admin/chat' : '/account/chat'

  useEffect(() => {
    const stored = storedBadge()
    if (stored > 0) void paintBadge(stored)
  }, [])

  useEffect(() => {
    const sync = () => setHeld(badgeHoldActive())
    sync()
    window.addEventListener('ih-badge-hold', sync)
    const timer = window.setInterval(sync, 5000)
    return () => {
      window.removeEventListener('ih-badge-hold', sync)
      window.clearInterval(timer)
    }
  }, [])

  useEffect(() => {
    if (!ready && !held) return
    const total = Math.max(count, held ? 1 : 0)
    void paintBadge(total)
    if (!user || announced.current === null) {
      announced.current = count
      return
    }
    if (count > announced.current && typeof Notification !== 'undefined' && Notification.permission === 'granted') {
      void showLockScreenNotice('Imperial Home', t('app.unreadOnPhone', { count }), link)
    }
    announced.current = count
  }, [count, ready, held, user, isStaff, link, t])

  useEffect(() => {
    const paint = () => {
      if (!ready && !badgeHoldActive()) return
      void paintBadge(Math.max(count, badgeHoldActive() ? 1 : 0))
    }
    window.addEventListener('pagehide', paint)
    document.addEventListener('visibilitychange', paint)
    window.addEventListener('pointerdown', paint)
    return () => {
      window.removeEventListener('pagehide', paint)
      document.removeEventListener('visibilitychange', paint)
      window.removeEventListener('pointerdown', paint)
    }
  }, [count, ready])

  return null
}
