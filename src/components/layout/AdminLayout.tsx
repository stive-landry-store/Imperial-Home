import { useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  BadgePercent,
  Building2,
  CalendarCheck,
  CalendarDays,
  Car,
  CreditCard,
  FileText,
  History,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageCircle,
  Settings,
  ScanLine,
  ShieldCheck,
  Star,
  Sparkles,
  Users,
  X,
  type LucideIcon,
} from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { isSupabaseConfigured } from '../../lib/supabase'
import { VerifiedBadge } from '../ui/VerifiedBadge'
import { ImperialLogo } from '../brand/Logo'
import { cn } from '../../lib/cn'
import { NotificationBell } from './NotificationBell'
import { ThemeSwitch } from './ThemeSwitch'
import { SocialLinks } from './SocialLinks'

const links: { to: string; key: string; icon: LucideIcon }[] = [
  { to: '/admin', key: 'dashboard', icon: LayoutDashboard },
  { to: '/admin/properties', key: 'properties', icon: Building2 },
  { to: '/admin/reservations', key: 'reservations', icon: CalendarCheck },
  { to: '/admin/calendar', key: 'calendar', icon: CalendarDays },
  { to: '/admin/customers', key: 'customers', icon: Users },
  { to: '/admin/promotions', key: 'promotions', icon: BadgePercent },
  { to: '/admin/vehicles', key: 'vehicles', icon: Car },
  { to: '/admin/payments', key: 'payments', icon: CreditCard },
  { to: '/admin/turnover', key: 'turnover', icon: Sparkles },
  { to: '/admin/reviews', key: 'reviewsAdmin', icon: Star },
  { to: '/admin/scan', key: 'scan', icon: ScanLine },
  { to: '/admin/chat', key: 'chat', icon: MessageCircle },
  { to: '/admin/housing-sheet', key: 'fiche', icon: FileText },
  { to: '/admin/admins', key: 'admins', icon: ShieldCheck },
  { to: '/admin/audit', key: 'audit', icon: History },
  { to: '/admin/settings', key: 'settings', icon: Settings },
]

export function AdminLayout() {
  const { t } = useTranslation()
  const { profile, admin, signOut } = useAuth()
  const location = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    setMenuOpen(false)
  }, [location.pathname])

  function renderNav() {
    return (
    <nav className="flex flex-col gap-1 px-3 pb-4">
      {links.map((l) => (
        <NavLink
          key={l.to}
          to={l.to}
          end={l.to === '/admin'}
          className={({ isActive }) =>
            cn(
              'flex min-h-12 items-center gap-3 rounded-lg px-3 py-3 text-base uppercase tracking-[0.12em] touch-manipulation',
              isActive ? 'bg-white/5 text-[#e0c57a]' : 'text-[#d4af6a]/80 hover:text-[#e0c57a]',
            )
          }
        >
          <l.icon className="h-6 w-6 shrink-0 text-[#d4af6a]" strokeWidth={1.6} />
          <span className="min-w-0 truncate">{t(`admin.${l.key}`)}</span>
        </NavLink>
      ))}
    </nav>
    )
  }

  return (
    <div className={cn('theme-page min-h-svh md:grid md:h-dvh md:grid-cols-[240px_1fr] lg:grid-cols-[260px_1fr]', location.pathname.startsWith('/admin/chat') && 'flex h-dvh flex-col md:grid')}>
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
            <p className="text-lg font-semibold">{t('admin.menu')}</p>
            <button
              type="button"
              className="inline-flex min-h-12 min-w-12 items-center justify-center touch-manipulation"
              aria-label={t('common.cancel')}
              onClick={() => setMenuOpen(false)}
            >
              <X size={26} />
            </button>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto pb-[max(1rem,env(safe-area-inset-bottom))]">
            {renderNav()}
            <div className="border-t border-[#d4af6a]/25 px-5 py-4">
              <SocialLinks />
              <button type="button" className="mt-4 flex min-h-11 items-center gap-3 text-base uppercase tracking-[0.12em]" onClick={() => void signOut()}>
                <LogOut className="h-5 w-5" strokeWidth={1.75} />
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
            className="flex min-h-11 items-center gap-3 px-5 pb-6 text-base uppercase tracking-[0.12em] text-gold"
            onClick={() => void signOut()}
          >
            <LogOut className="h-5 w-5" strokeWidth={1.75} />
            {t('nav.logout')}
          </button>
        </div>
      </aside>

      <div className={cn('admin-main min-w-0', location.pathname.startsWith('/admin/chat') ? 'flex min-h-0 flex-1 flex-col pb-0' : 'pb-[max(1.5rem,env(safe-area-inset-bottom))]')}>
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
