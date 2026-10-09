import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  BadgePercent,
  Building2,
  CalendarDays,
  Car,
  FileText,
  Heart,
  Home,
  Info,
  LayoutDashboard,
  LogOut,
  MapPin,
  MessageCircle,
  Phone,
  Settings,
  Share2,
  Shield,
  Sparkles,
  Star,
  UserRound,
  Users,
  Wallet,
  X,
} from 'lucide-react'
import { cn } from '../../lib/cn'
import { LANGUAGES, languageCode } from '../../lib/languages'
import { shareSite } from '../../lib/social'
import { useAuth } from '../../hooks/useAuth'
import { useTheme } from '../../hooks/useTheme'
import { VerifiedBadge } from '../ui/VerifiedBadge'
import { SocialLinks } from './SocialLinks'

const adminLinks = [
  { to: '/admin', labelKey: 'dashboard', icon: LayoutDashboard, end: true },
  { to: '/admin/properties', labelKey: 'properties', icon: Building2 },
  { to: '/admin/reservations', labelKey: 'reservations', icon: CalendarDays },
  { to: '/admin/calendar', labelKey: 'calendar', icon: CalendarDays },
  { to: '/admin/customers', labelKey: 'customers', icon: Users },
  { to: '/admin/promotions', labelKey: 'promotions', icon: BadgePercent },
  { to: '/admin/vehicles', labelKey: 'vehicles', icon: Car },
  { to: '/admin/payments', labelKey: 'payments', icon: Wallet },
  { to: '/admin/turnover', labelKey: 'turnover', icon: Sparkles },
  { to: '/admin/reviews', labelKey: 'reviewsAdmin', icon: Star },
  { to: '/admin/chat', labelKey: 'chat', icon: MessageCircle },
  { to: '/admin/housing-sheet', labelKey: 'fiche', icon: FileText },
  { to: '/admin/admins', labelKey: 'admins', icon: Shield },
  { to: '/admin/audit', labelKey: 'audit', icon: FileText },
  { to: '/admin/settings', labelKey: 'settings', icon: Settings },
] as const

export function SettingsMenu({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t, i18n } = useTranslation()
  const { theme, toggle } = useTheme()
  const { profile, admin, isStaff, signOut, user } = useAuth()
  const [copied, setCopied] = useState(false)
  const currentLanguage = languageCode(i18n.language)
  const roleLabel =
    profile?.role === 'main_admin' ? t('menu.roleMain') : profile?.role === 'admin' ? t('menu.roleAdmin') : t('menu.roleCustomer')
  const menuItems = [
    { to: user ? '/account/profile' : '/login?next=/account/profile', label: t('account.myAccount'), icon: UserRound },
    { to: user ? '/account' : '/login?next=/account', label: t('nav.reservations'), icon: CalendarDays },
    { to: '/favoris', label: t('nav.favorites'), icon: Heart },
    { to: '/properties', label: t('nav.residences'), icon: Home },
    { to: '/cars', label: t('nav.cars'), icon: Car },
    { to: '/properties/map', label: t('nav.map'), icon: MapPin },
    { to: '/contact', label: t('nav.contact'), icon: Phone },
    { to: '/fiche', label: t('account.housing'), icon: FileText },
    { to: '/', label: t('menu.about'), icon: Info },
  ]

  useEffect(() => {
    if (!open) return
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previous
    }
  }, [open])

  if (!open) return null

  return createPortal(
    <div
      className="fixed inset-0 z-[80] flex h-dvh w-full flex-col"
      style={{ background: 'var(--page)', color: 'var(--page-fg)' }}
      role="dialog"
      aria-modal="true"
      aria-label={t('nav.menu')}
    >
      <div className="flex items-center gap-3 px-4 py-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <p className="min-w-0 flex-1 text-lg font-semibold">{t('menu.title')}</p>
        <button
          type="button"
          className="inline-flex min-h-12 min-w-12 items-center justify-center touch-manipulation"
          aria-label={t('common.cancel')}
          onClick={onClose}
        >
          <X size={26} />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto px-4 pb-4">
        <p className="text-xs font-medium tracking-wide theme-muted uppercase">{t('menu.appearance')}</p>
        <div className="mt-2 flex items-center gap-3">
          <button
            type="button"
            className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-black/10"
            aria-label={theme === 'light' ? t('common.darkMode') : t('common.lightMode')}
            onClick={toggle}
          >
            {theme === 'light' ? <span className="text-lg">☾</span> : <span className="text-lg">☀</span>}
          </button>
          <div className="flex min-w-0 flex-1 gap-1 overflow-x-auto rounded-full border border-black/10 p-1">
            {LANGUAGES.map((item) => (
              <button
                key={item.code}
                type="button"
                className={cn(
                  'min-h-9 shrink-0 rounded-full px-3 text-xs font-semibold uppercase touch-manipulation',
                  item.code === currentLanguage ? 'bg-[#c4a35a] text-black' : 'theme-muted',
                )}
                onClick={() => void i18n.changeLanguage(item.code)}
              >
                {item.code}
              </button>
            ))}
          </div>
        </div>
        <p className="mt-6 text-xs font-medium tracking-wide theme-muted uppercase">{t('menu.settings')}</p>
        <nav className="mt-1">
          {menuItems.map((item) => (
            <Link key={item.label} to={item.to} className="flex min-h-12 items-center gap-3 text-base" onClick={onClose}>
              <item.icon className="h-5 w-5 text-[#c4a35a]" strokeWidth={1.75} />
              <span>{item.label}</span>
            </Link>
          ))}
          <button
            type="button"
            className="flex min-h-12 w-full items-center gap-3 text-left text-base"
            onClick={() =>
              void shareSite().then((result) => {
                if (result === 'copied') {
                  setCopied(true)
                  window.setTimeout(() => setCopied(false), 2000)
                }
              })
            }
          >
            <Share2 className="h-5 w-5 text-[#c4a35a]" strokeWidth={1.75} />
            <span>{copied ? t('nav.copied') : t('nav.share')}</span>
          </button>
        </nav>
        {isStaff ? (
          <>
            <p className="mt-6 text-xs font-medium tracking-wide theme-muted uppercase">{t('menu.console')}</p>
            <nav className="mt-1">
              {adminLinks.map((item) => (
                <Link key={item.to} to={item.to} className="flex min-h-12 items-center gap-3 text-base" onClick={onClose}>
                  <item.icon className="h-5 w-5 text-[#c4a35a]" strokeWidth={1.75} />
                  <span>{t(`admin.${item.labelKey}`)}</span>
                </Link>
              ))}
            </nav>
          </>
        ) : null}
        <div className="mt-4">
          <SocialLinks />
        </div>
      </div>
      <div className="shrink-0 border-t border-black/10 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        {user ? (
          <>
            <Link to="/account/profile" className="flex items-center gap-3" onClick={onClose}>
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt="" className="h-11 w-11 rounded-full object-cover" />
              ) : (
                <span className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-black/10">
                  <UserRound className="h-5 w-5" />
                </span>
              )}
              <span className="min-w-0">
                <span className="flex items-center gap-1 font-semibold">
                  <span className="truncate">{profile?.full_name || t('account.myAccount')}</span>
                  {admin?.is_verified ? <VerifiedBadge className="h-4 w-4" /> : null}
                </span>
                <span className="block text-sm theme-muted">{roleLabel}</span>
              </span>
            </Link>
            <button
              type="button"
              className="mt-3 flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-black/15 text-sm font-medium"
              onClick={() => void signOut()}
            >
              <LogOut className="h-4 w-4" />
              {t('nav.logout')}
            </button>
          </>
        ) : (
          <Link
            to="/login"
            className="flex min-h-11 w-full items-center justify-center rounded-xl border border-black/15 text-sm font-semibold"
            onClick={onClose}
          >
            {t('nav.login')}
          </Link>
        )}
      </div>
    </div>,
    document.body,
  )
}
