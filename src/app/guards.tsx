import { Navigate, useLocation } from 'react-router-dom'
import { useEffect, useState, type ReactNode } from 'react'
import { useAuth } from '../hooks/useAuth'
import type { PermissionKey } from '../types/database'
import { Loader } from '../components/ui/Loader'
import { useTranslation } from 'react-i18next'
import { MfaChallenge } from '../components/security/MfaChallenge'
import { readMfaState, type MfaState } from '../lib/mfa'

export function RequireAuth({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth()
  const location = useLocation()
  if (loading) return <div className="theme-page pt-24"><Loader size="lg" fill /></div>
  if (!user) return <Navigate to={`/login?next=${encodeURIComponent(location.pathname + location.search)}`} replace />
  return children
}

export function RequireStaff({ children, permission }: { children: ReactNode; permission?: PermissionKey }) {
  const { isStaff, hasPermission, loading, user } = useAuth()
  const { t } = useTranslation()
  const location = useLocation()
  const [mfa, setMfa] = useState<(MfaState & { userId: string }) | null>(null)
  const [version, setVersion] = useState(0)
  const userId = user?.id ?? null

  useEffect(() => {
    if (!isStaff || !userId) return
    let cancelled = false
    void readMfaState().then((state) => {
      if (!cancelled) setMfa({ ...state, userId })
    })
    return () => {
      cancelled = true
    }
  }, [isStaff, userId, version])

  if (loading) return <div className="theme-page"><Loader size="lg" fill /></div>
  if (!isStaff || (permission && !hasPermission(permission))) {
    return <p className="theme-page p-10">{t('admin.forbidden')}</p>
  }
  const state = mfa && mfa.userId === userId ? mfa : null
  if (!state) return <div className="theme-page"><Loader size="lg" fill /></div>
  // An enrolled authenticator must be confirmed on each new session.
  if (state.next === 'aal2' && state.current !== 'aal2') {
    return <MfaChallenge onDone={() => setVersion((v) => v + 1)} />
  }
  // When the house requires 2FA, staff without an authenticator can only open the security page.
  if (state.required && state.next !== 'aal2' && !location.pathname.startsWith('/admin/security')) {
    return <Navigate to="/admin/security?required=1" replace />
  }
  return children
}
