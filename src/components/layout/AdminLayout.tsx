import { useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { LogOut, Menu, X } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { isSupabaseConfigured } from '../../lib/supabase'
import { VerifiedBadge } from '../ui/VerifiedBadge'
import { ImperialLogo } from '../brand/Logo'
import { cn } from '../../lib/cn'
import { NotificationBell } from './NotificationBell'
import { ThemeSwitch } from './ThemeSwitch'
import { SocialLinks } from './SocialLinks'

const links = [
  { to: '/admin', key: 'dashboard', end: true },
  { to: '/admin/properties', key: 'properties' },
  { to: '/admin/reservations', key: 'reservations' },
  { to: '/admin/calendar', key: 'calendar' },
  { to: '/admin/customers', key: 'customers' },
  { to: '/admin/promotions', key: 'promotions' },
  { to: '/admin/vehicles', key: 'vehicles' },
  { to: '/admin/payments', key: 'payments' },
  { to: '/admin/turnover', key: 'turnover' },
  { to: '/admin/reviews', key: 'reviewsAdmin' },
  { to: '/admin/chat', key: 'chat' },
  { to: '/admin/housing-sheet', key: 'fiche' },
  { to: '/admin/admins', key: 'admins' },
  { to: '/admin/audit', key: 'audit' },
  { to: '/admin/settings', key: 'settings' },
] as const

export function AdminLayout() {
  const { t } = useTranslation()
  const { profile, admin, signOut } = useAuth()
  const location = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    setMenuOpen(false)
  }, [location.pathname])

  useEffect(() => {
    if (!menuOpen) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [menuOpen])

  function renderNav() {
    return (
    <nav className="flex flex-col gap-1 px-3 pb-4">
      <NavLink
        to="/account/profile"
        className={({ isActive }) =>
          cn(
            'inline-flex min-h-12 items-center px-3 py-3 text-base uppercase tracking-[0.12em] touch-manipulation',
            isActive ? 'bg-white/5 text-[#e0c57a]' : 'text-[#d4af6a]/80 hover:text-[#e0c57a]',
          )
        }
      >
        {t('account.profile')}
      </NavLink>
      {links.map((l) => (
        <NavLink
          key={l.to}
          to={l.to}
          end={l.to === '/admin'}
          className={({ isActive }) =>
            cn(
              'inline-flex min-h-12 items-center px-3 py-3 text-base uppercase tracking-[0.12em] touch-manipulation',
              isActive ? 'bg-white/5 text-[#e0c57a]' : 'text-[#d4af6a]/80 hover:text-[#e0c57a]',
            )
          }
        >
          {t(`admin.${l.key}`)}
        </NavLink>
      ))}
    </nav>
    )
  }

  return (
    <div className="theme-page min-h-svh md:grid md:grid-cols-[240px_1fr] lg:grid-cols-[260px_1fr]">
      <header className="sticky top-0 z-40 flex items-center gap-2 border-b border-[#d4af6a]/20 bg-black px-3 py-2 text-[#d4af6a] pt-[max(0.5rem,env(safe-area-inset-top))] md:hidden">
        <button
          type="button"
          className="inline-flex min-h-11 min-w-11 items-center justify-center touch-manipulation"
          aria-label={t('admin.menu')}
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen(true)}
        >
          <Menu size={26} strokeWidth={2} />
        </button>
        <NavLink to="/" className="min-w-0 flex-1 origin-left scale-90">
          <ImperialLogo light compact />
        </NavLink>
        <NotificationBell />
        <ThemeSwitch compact />
        <button
          type="button"
          className="inline-flex min-h-11 min-w-11 items-center justify-center touch-manipulation"
          onClick={() => void signOut()}
          aria-label={t('nav.logout')}
        >
          <LogOut size={20} />
        </button>
      </header>

      {menuOpen ? (
        <div className="fixed inset-0 z-[80] flex h-dvh w-full flex-col bg-black text-[#d4af6a] md:hidden">
          <div className="flex items-center justify-between px-4 py-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
            <p className="font-display text-2xl">{t('admin.menu')}</p>
            <button
              type="button"
              className="inline-flex min-h-12 min-w-12 items-center justify-center touch-manipulation"
              aria-label={t('common.cancel')}
              onClick={() => setMenuOpen(false)}
            >
              <X size={28} />
            </button>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto pb-[max(1.5rem,env(safe-area-inset-bottom))]">
            {renderNav()}
            <div className="border-t border-[#d4af6a]/25 px-5 py-4">
              <div className="mb-3 flex items-center gap-3 text-sm">
                {profile?.avatar_url ? <img src={profile.avatar_url} alt="" className="h-10 w-10 rounded-full object-cover" /> : null}
                <p className="min-w-0 flex-1 truncate">{profile?.full_name || profile?.email}</p>
                {admin?.is_verified ? <VerifiedBadge className="h-6 w-6" /> : null}
              </div>
              <p className="mb-2 text-sm tracking-[0.18em] uppercase">{t('nav.networks')}</p>
              <SocialLinks />
              <button type="button" className="mt-4 min-h-12 text-base uppercase tracking-[0.12em]" onClick={() => void signOut()}>
                {t('nav.logout')}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <aside className="hidden border-r border-[#d4af6a]/20 bg-black text-[#d4af6a] md:flex md:h-svh md:flex-col md:overflow-y-auto">
        <div className="px-5 py-5">
          <NavLink to="/" className="block">
            <ImperialLogo light compact />
          </NavLink>
        </div>
        {renderNav()}
        <div className="mt-auto">
          <div className="flex items-center gap-2 px-5 py-4 text-base">
            {profile?.avatar_url ? <img src={profile.avatar_url} alt="" className="h-9 w-9 rounded-full object-cover" /> : null}
            <span>{profile?.full_name || profile?.email}</span>
            {admin?.is_verified ? <VerifiedBadge className="h-6 w-6" /> : null}
          </div>
          <div className="px-5 pb-3">
            <SocialLinks />
          </div>
          <div className="px-5 pb-3">
            <ThemeSwitch compact />
          </div>
          <button
            type="button"
            className="min-h-11 px-5 pb-6 text-base uppercase tracking-[0.12em] text-gold"
            onClick={() => void signOut()}
          >
            {t('nav.logout')}
          </button>
        </div>
      </aside>

      <div className="admin-main min-w-0 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
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
