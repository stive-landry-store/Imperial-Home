import { useEffect, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../hooks/useAuth'
import { forgetPrivateOfflineData, hydrateOfflineCache, startOfflinePersistence } from '../lib/offlineCache'

export function OfflineCache() {
  const client = useQueryClient()
  const { user, loading } = useAuth()
  const hadUser = useRef(false)
  const userId = user?.id ?? null

  useEffect(() => {
    if (loading) return
    if (hadUser.current && !userId) forgetPrivateOfflineData()
    hadUser.current = Boolean(userId)
    hydrateOfflineCache(client, userId)
    return startOfflinePersistence(client, userId)
  }, [client, userId, loading])

  return null
}
