import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { warmOfflineData } from '../lib/offlinePrefetch'

export function OfflinePrefetch() {
  const client = useQueryClient()
  useEffect(() => {
    let cancelled = false
    const run = () => {
      if (!cancelled) void warmOfflineData(client).catch(() => undefined)
    }
    const timer = window.setTimeout(run, 4000)
    window.addEventListener('online', run)
    return () => {
      cancelled = true
      window.clearTimeout(timer)
      window.removeEventListener('online', run)
    }
  }, [client])
  return null
}
