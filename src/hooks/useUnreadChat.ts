import { useCallback, useEffect, useRef, useState } from 'react'
import { useAuth } from './useAuth'
import { chatSeen } from '../lib/chatText'
import { supabase } from '../lib/supabase'

type Row = { conversation_id: string; role: string; created_at: string }

export function useUnreadChat() {
  const { user } = useAuth()
  const [count, setCount] = useState(0)
  const userId = user?.id
  const instance = useRef(Math.random().toString(36).slice(2, 8))

  const refresh = useCallback(async () => {
    if (!supabase || !userId) {
      setCount(0)
      return
    }
    const { data: convs } = await supabase.from('conversations').select('id').eq('customer_id', userId)
    const ids = (convs ?? []).map((row) => row.id as string)
    if (!ids.length) {
      setCount(0)
      return
    }
    const { data } = await supabase
      .from('messages')
      .select('conversation_id, role, created_at')
      .in('conversation_id', ids)
      .in('role', ['admin', 'assistant'])
      .order('created_at', { ascending: false })
      .limit(300)
    const rows = (data ?? []) as Row[]
    setCount(rows.filter((row) => row.created_at > chatSeen(row.conversation_id)).length)
  }, [userId])

  useEffect(() => {
    void refresh()
    if (!supabase || !userId) return
    const client = supabase
    const channel = client
      .channel(`unread-${userId}-${instance.current}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, () => void refresh())
      .subscribe()
    const onSeen = () => void refresh()
    window.addEventListener('ih-chat-seen', onSeen)
    window.addEventListener('focus', onSeen)
    const timer = window.setInterval(onSeen, 60_000)
    return () => {
      void client.removeChannel(channel)
      window.removeEventListener('ih-chat-seen', onSeen)
      window.removeEventListener('focus', onSeen)
      window.clearInterval(timer)
    }
  }, [refresh, userId])

  return count
}
