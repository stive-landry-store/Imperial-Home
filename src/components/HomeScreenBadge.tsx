import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '../hooks/useAuth'
import { useUnreadChat } from '../hooks/useUnreadChat'
import { fetchMyNotifications } from '../lib/data'
import { badgeHoldActive, paintBadge } from '../lib/systemNotifications'
import { supabase } from '../lib/supabase'

/** Red number on the phone's home-screen icon, same place as WhatsApp or Safari. */
export function HomeScreenBadge() {
  const { user, isStaff } = useAuth()
  const unreadChat = useUnreadChat()
  const [held, setHeld] = useState(() => badgeHoldActive())
  const { data = [] } = useQuery({
    queryKey: ['notifications', user?.id],
    queryFn: fetchMyNotifications,
    enabled: Boolean(user),
  })
  const { data: waiting = 0 } = useQuery({
    queryKey: ['badge-waiting', user?.id],
    enabled: Boolean(supabase && user && isStaff),
    queryFn: async () => {
      const { count, error } = await supabase!.from('conversations').select('id', { count: 'exact', head: true }).eq('needs_human', true)
      if (error) return 0
      return count ?? 0
    },
    refetchInterval: 30_000,
  })
  const unreadNotes = data.filter((item) => !item.read_at).length
  const total = Math.max(unreadNotes, user ? (isStaff ? waiting : unreadChat) : 0, held ? 1 : 0)

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
    void paintBadge(total)
  }, [total])

  return null
}
