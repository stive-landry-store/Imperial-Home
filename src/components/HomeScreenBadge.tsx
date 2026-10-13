import { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '../hooks/useAuth'
import { useUnreadChat } from '../hooks/useUnreadChat'
import { fetchMyNotifications } from '../lib/data'

type BadgeNavigator = Navigator & {
  setAppBadge?: (count?: number) => Promise<void>
  clearAppBadge?: () => Promise<void>
}

/** Red number on the phone's home-screen icon, same place as WhatsApp or Safari. */
export function HomeScreenBadge() {
  const { user } = useAuth()
  const unreadChat = useUnreadChat()
  const { data = [] } = useQuery({
    queryKey: ['notifications', user?.id],
    queryFn: fetchMyNotifications,
    enabled: Boolean(user),
  })
  const unreadNotes = data.filter((item) => !item.read_at).length
  const total = Math.max(unreadNotes, user ? unreadChat : 0)

  useEffect(() => {
    const nav = navigator as BadgeNavigator
    if (!nav.setAppBadge) return
    const action = total > 0 ? nav.setAppBadge(total) : nav.clearAppBadge?.()
    void Promise.resolve(action).catch(() => undefined)
  }, [total])

  return null
}
