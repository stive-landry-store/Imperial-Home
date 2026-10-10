import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'
import { notify } from '../lib/systemNotifications'

const TABLES = [
  'reservations',
  'properties',
  'property_images',
  'vehicles',
  'vehicle_media',
  'system_config',
  'promotions',
  'property_blocks',
  'notifications',
  'messages',
] as const

/** Keep calendars and catalogue in sync with Supabase on every device (local, mobile, Vercel). */
export function useLiveData() {
  const client = useQueryClient()
  const { user, isStaff } = useAuth()
  const userId = user?.id

  useEffect(() => {
    const db = supabase
    if (!db) return

    const channel = db.channel('imperial-live')
    for (const table of TABLES) {
      channel.on('postgres_changes', { event: '*', schema: 'public', table }, () => {
        void client.invalidateQueries()
      })
    }
    channel.on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications' }, (payload) => {
      const row = payload.new as { user_id?: string; title?: string; body?: string | null; link?: string | null }
      if (userId && row.user_id === userId) void notify(row.title ?? 'Impérial Home', row.body ?? '', row.link ?? '/account')
    })
    if (isStaff) {
      channel.on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'reservations' }, (payload) => {
        const row = payload.new as { id?: string; public_code?: string }
        void notify('Nouvelle réservation', row.public_code ?? '', row.id ? `/admin/reservations/${row.id}` : '/admin/reservations')
      })
    }
    channel.subscribe()
    void db.rpc('dispatch_stay_reminders').then(() => {
      void client.invalidateQueries({ queryKey: ['notifications'] })
    })

    return () => {
      void db.removeChannel(channel)
    }
  }, [client, userId, isStaff])
}
