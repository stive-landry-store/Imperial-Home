import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'

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

  useEffect(() => {
    const db = supabase
    if (!db) return

    const channel = db.channel('imperial-live')
    for (const table of TABLES) {
      channel.on('postgres_changes', { event: '*', schema: 'public', table }, () => {
        void client.invalidateQueries()
      })
    }
    channel.subscribe()

    return () => {
      void db.removeChannel(channel)
    }
  }, [client])
}
