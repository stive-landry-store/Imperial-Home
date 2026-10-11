import { useEffect } from 'react'
import { captureReferral, claimStoredReferral } from '../lib/referral'
import { useAuth } from '../hooks/useAuth'

export function ReferralTracker() {
  const { user } = useAuth()
  useEffect(() => {
    captureReferral()
  }, [])
  useEffect(() => {
    if (user) void claimStoredReferral()
  }, [user])
  return null
}
