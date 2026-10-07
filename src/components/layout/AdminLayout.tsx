import { NavLink, Outlet } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../hooks/useAuth'
import { isSupabaseConfigured } from '../../lib/supabase'
import { VerifiedBadge } from '../ui/VerifiedBadge'
import { ImperialLogo } from '../brand/Logo'
import { cn } from '../../lib/cn'
import { PreferenceBar } from './PreferenceBar'

const links = [
  { to: '/admin', key: 'dashboard', end: true },
  { to: '/admin/properties', key: 'properties' },
  { to: '/admin/reservations', key: 'reservations' },
  { to: '/admin/calendar', key: 'calendar' },
  { to: '/admin/customers', key: 'customers' },
  { to: '/admin/promotions', key: 'promotions' },
  { to: '/admin/vehicles', key: 'vehicles' },
  { to: '/admin/payments', key: 'payments' },
  { to: '/admin/chat', key: 'chat' },
  { to: '/admin/housing-sheet', key: 'fiche' },
  { to: '/admin/admins', key: 'admins' },
  { to: '/admin/audit', key: 'audit' },
  { to: '/admin/settings', key: 'settings' },
] as const

export function AdminLayout() {
  const { t } = useTranslation()
  const { profile, admin, signOut } = useAuth()

  return (
    <div className="theme-page min-h-svh md:grid md:grid-cols-[260px_1fr]">
      <aside className="border-b border-[#d4af6a]/20 bg-black text-[#d4af6a] md:border-b-0 md:border-r">
        <div className="px-5 py-5">
          <NavLink to="/" className="block scale-90 origin-left">
            <ImperialLogo light compact />
          </NavLink>
        </div>
        <nav className="flex gap-2 overflow-x-auto px-3 pb-4 md:flex-col md:overflow-visible">
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.to === '/admin'}
              className={({ isActive }) =>
                cn(
                  'whitespace-nowrap px-3 py-2 text-base uppercase tracking-[0.12em]',
                  isActive ? 'bg-white/5 text-[#e0c57a]' : 'text-[#d4af6a]/70 hover:text-[#e0c57a]',
                )
              }
            >
              {t(`admin.${l.key}`)}
            </NavLink>
          ))}
        </nav>
        <div className="hidden items-center gap-2 px-5 py-4 text-base md:flex">
          <span>{profile?.full_name || profile?.email}</span>
          {admin?.is_verified ? <VerifiedBadge /> : null}
        </div>
        <div className="px-5 pb-3">
          <PreferenceBar compact />
        </div>
        <button type="button" className="hidden px-5 pb-6 text-base uppercase tracking-[0.12em] text-gold md:block" onClick={() => void signOut()}>
          {t('nav.logout')}
        </button>
      </aside>
      <div className="admin-main min-w-0">
        {!isSupabaseConfigured() ? (
          <div className="border-b border-amber-600/40 bg-amber-950/80 px-4 py-3 text-sm text-amber-100 md:px-8">
            {t('admin.supabaseRequired')}
          </div>
        ) : null}
        <Outlet />
      </div>
    </div>
  )
}
