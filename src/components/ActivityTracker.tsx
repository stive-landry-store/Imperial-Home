import { useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { isSessionStarted, logActivity, markSessionStarted } from '../lib/activity'

export function ActivityTracker() {
  const { user } = useAuth()
  const location = useLocation()
  const last = useRef({ path: '', at: 0 })
  const userId = user?.id

  useEffect(() => {
    if (!userId || isSessionStarted()) return
    markSessionStarted()
    void logActivity('open', location.pathname)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId])

  useEffect(() => {
    if (!userId) return
    const path = location.pathname
    const now = Date.now()
    if (last.current.path === path && now - last.current.at < 3000) return
    last.current = { path, at: now }
    void logActivity('page', path)
  }, [userId, location.pathname])

  return null
}
