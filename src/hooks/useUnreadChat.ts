import { useCallback, useEffect, useRef, useState } from 'react'
import { useAuth } from './useAuth'
import { chatSeen } from '../lib/chatText'
import { supabase } from '../lib/supabase'

type Row = { conversation_id: string; role: string; created_at: string }

function unreadSince(rows: Row[]) {
  return rows.filter((row) => row.created_at > chatSeen(row.conversation_id)).length
}

/** Same unread total the chat list shows, for the signed-in person. */
export function useUnreadChat() {
  const { user, isStaff, loading } = useAuth()
  const [count, setCount] = useState(0)
  const [ready, setReady] = useState(false)
  const userId = user?.id
  const instance = useRef(Math.random().toString(36).slice(2, 8))

  const refresh = useCallback(async () => {
    if (loading) return
    if (!supabase || !userId) {
      setCount(0)
      setReady(true)
      return
    }
    const client = supabase
    if (isStaff) {
      const { data: convs, error } = await client.from('conversations').select('id, status')
      if (error) return
      const ids = (convs ?? [])
        .filter((row) => row.status !== 'closed' && row.status !== 'archived')
        .map((row) => row.id as string)
      if (!ids.length) {
        setCount(0)
        setReady(true)
        return
      }
      const { data, error: messageError } = await client
        .from('messages')
        .select('conversation_id, role, created_at')
        .in('conversation_id', ids)
        .order('created_at', { ascending: false })
        .limit(500)
      if (messageError) return
      const rows = ((data ?? []) as Row[]).filter((row) => row.role === 'customer')
      setCount(unreadSince(rows))
      setReady(true)
      return
    }

    const { data: convs, error } = await client.from('conversations').select('id').eq('customer_id', userId)
    if (error) return
    const ids = (convs ?? []).map((row) => row.id as string)
    if (!ids.length) {
      setCount(0)
      setReady(true)
      return
    }
    const { data, error: messageError } = await client
      .from('messages')
      .select('conversation_id, role, created_at')
      .in('conversation_id', ids)
      .in('role', ['admin', 'assistant'])
      .order('created_at', { ascending: false })
      .limit(300)
    if (messageError) return
    setCount(unreadSince((data ?? []) as Row[]))
    setReady(true)
  }, [userId, isStaff, loading])

  useEffect(() => {
    void refresh()
    if (!supabase || !userId || loading) return
    const client = supabase
    const channel = client
      .channel(`unread-${userId}-${instance.current}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, () => void refresh())
      .subscribe()
    const onSeen = () => void refresh()
    window.addEventListener('ih-chat-seen', onSeen)
    window.addEventListener('focus', onSeen)
    const timer = window.setInterval(onSeen, 20_000)
    return () => {
      void client.removeChannel(channel)
      window.removeEventListener('ih-chat-seen', onSeen)
      window.removeEventListener('focus', onSeen)
      window.clearInterval(timer)
    }
  }, [refresh, userId, loading])

  return { count, ready }
}
