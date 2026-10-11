import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { BellRing, X } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../hooks/useAuth'
import { markNotificationRead } from '../lib/data'
import { haptic } from '../lib/haptics'
import { supabase } from '../lib/supabase'

type Incoming = { id: string; title: string; body: string | null; link: string | null }

export function IncomingToast() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const client = useQueryClient()
  const [item, setItem] = useState<Incoming | null>(null)
  const timer = useRef<number>(0)
  const path = useRef(location.pathname)
  path.current = location.pathname

  useEffect(() => {
    if (!supabase || !user) return
    const db = supabase
    const channel = db
      .channel(`toast-${user.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` }, (payload) => {
        const row = payload.new as Incoming
        void client.invalidateQueries({ queryKey: ['notifications'] })
        if (row.link && path.current.startsWith(row.link) && row.link.endsWith('/chat')) return
        setItem({ id: row.id, title: row.title, body: row.body, link: row.link })
        haptic(30)
        window.clearTimeout(timer.current)
        timer.current = window.setTimeout(() => setItem(null), 8000)
      })
      .subscribe()
    return () => {
      window.clearTimeout(timer.current)
      void db.removeChannel(channel)
    }
  }, [user, client])

  if (!item) return null

  function open() {
    if (!item) return
    void markNotificationRead(item.id).then(() => client.invalidateQueries({ queryKey: ['notifications'] }))
    if (item.link) navigate(item.link)
    setItem(null)
  }

  return (
    <div
      className="pointer-events-none fixed inset-x-0 top-0 z-[130] flex justify-center px-3"
      style={{ paddingTop: 'max(0.75rem, env(safe-area-inset-top))' }}
      role="status"
      aria-live="polite"
    >
      <div className="pointer-events-auto flex w-full max-w-md items-start gap-3 rounded-2xl border border-[#d4af6a]/70 bg-[#0b0b0c] p-4 text-[#f4eee3] shadow-[0_18px_50px_rgba(0,0,0,0.75)]">
        <button type="button" className="flex min-w-0 flex-1 items-start gap-3 text-left" onClick={open}>
          <span className="mt-0.5 grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[#d4af6a] text-black">
            <BellRing className="h-6 w-6" />
          </span>
          <span className="min-w-0">
            <span className="block text-[17px] leading-snug font-semibold">{item.title}</span>
            {item.body ? <span className="mt-0.5 line-clamp-3 block text-[16px] leading-snug text-white/80">{item.body}</span> : null}
          </span>
        </button>
        <button type="button" className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-white/70" aria-label="Close" onClick={() => setItem(null)}>
          <X className="h-5 w-5" />
        </button>
      </div>
    </div>
  )
}
