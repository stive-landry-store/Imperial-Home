import { useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  Activity,
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
  RotateCcw,
  ChevronRight,
  MessageCircle,
  Settings,
  ScanLine,
  ShieldCheck,
  Star,
  Sparkles,
  Users,
  X,
  type LucideIcon, KeyRound, Tags } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { isSupabaseConfigured } from '../../lib/supabase'
import { VerifiedBadge } from '../ui/VerifiedBadge'
import { ImperialLogo, ImperialMark } from '../brand/Logo'
import { cn } from '../../lib/cn'
import { NotificationBell } from './NotificationBell'
import { ThemeSwitch } from './ThemeSwitch'
import { LanguageDock } from './LanguageDock'
import { SocialLinks } from './SocialLinks'
import { PageTransition } from './PageTransition'

const links: { to: string; key: string; icon: LucideIcon; tone: string }[] = [
  { to: '/admin', key: 'dashboard', icon: LayoutDashboard, tone: 'ih-tone-a' },
  { to: '/admin/properties', key: 'properties', icon: Building2, tone: 'ih-tone-b' },
  { to: '/admin/reservations', key: 'reservations', icon: CalendarCheck, tone: 'ih-tone-c' },
  { to: '/admin/calendar', key: 'calendar', icon: CalendarDays, tone: 'ih-tone-e' },
  { to: '/admin/customers', key: 'customers', icon: Users, tone: 'ih-tone-b' },
  { to: '/admin/promotions', key: 'promotions', icon: BadgePercent, tone: 'ih-tone-d' },
  { to: '/admin/pricing', key: 'pricing', icon: Tags, tone: 'ih-tone-a' },
  { to: '/admin/security', key: 'security', icon: KeyRound, tone: 'ih-tone-e' },
  { to: '/admin/vehicles', key: 'vehicles', icon: Car, tone: 'ih-tone-b' },
  { to: '/admin/payments', key: 'payments', icon: CreditCard, tone: 'ih-tone-c' },
  { to: '/admin/turnover', key: 'turnover', icon: Sparkles, tone: 'ih-tone-e' },
  { to: '/admin/reviews', key: 'reviewsAdmin', icon: Star, tone: 'ih-tone-a' },
  { to: '/admin/scan', key: 'scan', icon: ScanLine, tone: 'ih-tone-b' },
  { to: '/admin/chat', key: 'chat', icon: MessageCircle, tone: 'ih-tone-c' },
  { to: '/admin/housing-sheet', key: 'fiche', icon: FileText, tone: 'ih-tone-a' },
  { to: '/admin/admins', key: 'admins', icon: ShieldCheck, tone: 'ih-tone-e' },
  { to: '/admin/audit', key: 'audit', icon: History, tone: 'ih-tone-b' },
  { to: '/admin/activity', key: 'activity', icon: Activity, tone: 'ih-tone-d' },
  { to: '/admin/settings', key: 'settings', icon: Settings, tone: 'ih-tone-a' },
]

export function AdminLayout() {
  const { t } = useTranslation()
  const { profile, admin, signOut } = useAuth()
  const location = useLocation()
  // The menu closes by itself on navigation: it is open only for the page it was opened on.
  const [menuPath, setMenuPath] = useState<string | null>(null)
  const menuOpen = menuPath === location.pathname
  const setMenuOpen = (value: boolean) => setMenuPath(value ? location.pathname : null)

  const row = 'ih-admin-link flex min-h-[3.25rem] items-center gap-3 rounded-2xl px-2.5 py-1.5 text-[15px] font-medium touch-manipulation'

  function renderNav() {
    return (
    <nav className="ih-admin-nav flex flex-col gap-1 px-3 pb-4">
      {profile?.role === 'super_admin' ? (
        <NavLink to="/admin#reset" className={cn(row, 'ih-admin-danger mb-2 text-[var(--page-fg)]')}>
          <span className="ih-admin-tile ih-tone-d grid h-9 w-9 shrink-0 place-items-center rounded-xl">
            <RotateCcw className="h-[18px] w-[18px]" strokeWidth={1.9} />
          </span>
          <span className="min-w-0 flex-1 break-words">{t('admin.resetStatsButton')}</span>
          <ChevronRight className="ih-admin-chevron h-4 w-4 shrink-0 opacity-40 rtl:scale-x-[-1]" />
        </NavLink>
      ) : null}
      {links.filter((l) => l.to !== '/admin/activity' || profile?.role === 'super_admin').map((l, index) => (
        <NavLink
          key={l.to}
          to={l.to}
          end={l.to === '/admin'}
          style={{ ['--ih-i' as string]: index }}
          className={({ isActive }) => cn(row, isActive ? 'is-active text-[var(--page-fg)]' : 'text-[var(--page-fg)]/80')}
        >
          <span className={cn('ih-admin-tile grid h-9 w-9 shrink-0 place-items-center rounded-xl', l.tone)}>
            <l.icon className="h-[18px] w-[18px]" strokeWidth={1.9} />
          </span>
          <span className="min-w-0 flex-1 truncate">{t(`admin.${l.key}`)}</span>
          <ChevronRight className="ih-admin-chevron h-4 w-4 shrink-0 opacity-40 rtl:scale-x-[-1]" />
        </NavLink>
      ))}
    </nav>
    )
  }

  return (
    <div className={cn('theme-page min-h-svh md:grid md:h-dvh md:grid-cols-[240px_1fr] lg:grid-cols-[260px_1fr]', location.pathname.startsWith('/admin/chat') && 'flex h-dvh flex-col md:grid')}>
      <header className="ih-admin-topbar relative z-40 flex items-center gap-1 border-b border-accent/20 px-2 py-2 text-accent pt-[max(0.5rem,env(safe-area-inset-top))] md:hidden">
        <button
          type="button"
          className="inline-flex h-10 w-10 shrink-0 items-center justify-center touch-manipulation"
          aria-label={t('admin.menu')}
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen(true)}
        >
          <Menu size={24} strokeWidth={2} />
        </button>
        <NavLink to="/" className="flex min-w-0 flex-1 items-center gap-1.5 overflow-hidden">
          <ImperialMark className="h-8 w-auto shrink-0" />
          <span className="truncate font-display text-[0.95rem] tracking-[0.14em]">IMPERIAL</span>
        </NavLink>
        <div className="flex shrink-0 items-center">
          <NotificationBell />
          <LanguageDock placement="header" />
          <ThemeSwitch compact />
          <button
            type="button"
            className="inline-flex h-10 w-10 items-center justify-center touch-manipulation"
            onClick={() => void signOut()}
            aria-label={t('nav.logout')}
          >
            <LogOut size={18} />
          </button>
        </div>
      </header>

      {menuOpen ? (
        <div className="ih-admin-sheet fixed inset-0 z-[80] flex h-dvh w-full flex-col text-[var(--page-fg)] md:hidden" role="dialog" aria-modal="true">
          <div className="ih-settings-hero relative shrink-0 overflow-hidden px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-3">
            <div className="ih-settings-hero-glow" aria-hidden />
            <div className="relative flex items-center gap-3 py-2">
              <p className="min-w-0 flex-1 font-display text-2xl font-medium">{t('admin.menu')}</p>
              <button
                type="button"
                className="ih-settings-close grid h-11 w-11 place-items-center rounded-full border border-line bg-[var(--card-bg)] touch-manipulation"
                aria-label={t('common.cancel')}
                onClick={() => setMenuOpen(false)}
              >
                <X size={22} />
              </button>
            </div>
            <div className="ih-settings-me relative mt-2 flex items-center gap-3 rounded-3xl border border-line bg-[var(--card-bg)]/80 p-3 backdrop-blur">
              <span className="ih-settings-avatar grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-full bg-accent-soft text-accent">
                {profile?.avatar_url ? <img src={profile.avatar_url} alt="" className="h-full w-full object-cover" /> : <ShieldCheck className="h-5 w-5" />}
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-1 font-semibold">
                  <span className="truncate">{profile?.full_name || profile?.email}</span>
                  {admin?.is_verified ? <VerifiedBadge className="h-4 w-4" /> : null}
                </span>
                <span className="mt-0.5 inline-flex rounded-full bg-accent-soft px-2 py-0.5 text-[12px] font-semibold text-accent">{t('nav.admin')}</span>
              </span>
            </div>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto pb-[max(1rem,env(safe-area-inset-bottom))]">
            {renderNav()}
            <div className="border-t border-line px-4 py-4">
              <div className="flex justify-center">
                <SocialLinks />
              </div>
              <button
                type="button"
                className="ih-btn mt-4 flex min-h-12 w-full items-center justify-center gap-2 rounded-full border border-red-200 text-sm font-semibold text-red-700 hover:bg-red-50"
                onClick={() => void signOut()}
              >
                <LogOut className="h-4 w-4" />
                {t('nav.logout')}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <aside className="ih-admin-aside hidden border-e border-line text-[var(--page-fg)] md:flex md:h-svh md:flex-col md:overflow-y-auto">
        <div className="ih-admin-brand px-5 py-5">
          <NavLink to="/" className="block">
            <ImperialLogo light compact />
          </NavLink>
        </div>
        {renderNav()}
        <div className="mt-auto">
          <div className="ih-settings-me mx-3 mt-2 mb-3 flex items-center gap-3 rounded-2xl border border-line bg-[var(--card-bg)] p-2.5 text-[var(--page-fg)]">
            <span className="ih-settings-avatar grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-full bg-accent-soft text-accent">
              {profile?.avatar_url ? <img src={profile.avatar_url} alt="" className="h-full w-full object-cover" /> : <ShieldCheck className="h-5 w-5" />}
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-1 text-sm font-semibold">
                <span className="truncate">{profile?.full_name || profile?.email}</span>
                {admin?.is_verified ? <VerifiedBadge className="h-4 w-4" /> : null}
              </span>
              <span className="text-[12px] theme-muted">{t('nav.admin')}</span>
            </span>
          </div>
          <div className="px-5 pb-3">
            <SocialLinks />
          </div>
          <div className="flex items-center gap-3 px-5 pb-3">
            <LanguageDock placement="header" />
            <ThemeSwitch compact />
          </div>
          <button
            type="button"
            className="ih-btn mx-3 mb-6 flex min-h-11 w-[calc(100%-1.5rem)] items-center justify-center gap-2 rounded-full border border-red-200 text-sm font-semibold text-red-700 hover:bg-red-50"
            onClick={() => void signOut()}
          >
            <LogOut className="h-4 w-4" />
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
        <PageTransition className={location.pathname.startsWith('/admin/chat') ? 'flex min-h-0 flex-1 flex-col' : undefined}>
          <Outlet />
        </PageTransition>
      </div>
    </div>
  )
}
