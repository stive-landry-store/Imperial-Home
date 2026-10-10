import { Navigate, useLocation } from 'react-router-dom'
import type { ReactNode } from 'react'
import { useAuth } from '../hooks/useAuth'
import type { PermissionKey } from '../types/database'
import { Loader } from '../components/ui/Loader'
import { useTranslation } from 'react-i18next'

export function RequireAuth({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth()
  const location = useLocation()
  if (loading) return <div className="theme-page pt-24"><Loader size="lg" fill /></div>
  if (!user) return <Navigate to={`/login?next=${encodeURIComponent(location.pathname + location.search)}`} replace />
  return children
}

export function RequireStaff({ children, permission }: { children: ReactNode; permission?: PermissionKey }) {
  const { isStaff, hasPermission, loading } = useAuth()
  const { t } = useTranslation()
  if (loading) return <div className="theme-page"><Loader size="lg" fill /></div>
  if (!isStaff || (permission && !hasPermission(permission))) {
    return <p className="theme-page p-10">{t('admin.forbidden')}</p>
  }
  return children
}
