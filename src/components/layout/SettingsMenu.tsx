import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  CalendarDays,
  Car,
  FileText,
  Heart,
  Home,
  Info,
  LogOut,
  MapPin,
  Phone,
  Share2,
  Shield,
  UserRound,
  ChevronRight,
  Moon,
  Sun,
  X,
} from 'lucide-react'
import { cn } from '../../lib/cn'
import { LANGUAGES, languageCode } from '../../lib/languages'
import { Flag } from '../ui/Flag'
import { shareSite } from '../../lib/social'
import { GetAppCard } from './GetAppCard'
import { useAuth } from '../../hooks/useAuth'
import { useTheme } from '../../hooks/useTheme'
import { VerifiedBadge } from '../ui/VerifiedBadge'
import { SocialLinks } from './SocialLinks'
import { AppFeatures } from './AppFeatures'

export function SettingsMenu({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t, i18n } = useTranslation()
  const { theme, toggle } = useTheme()
  const { profile, admin, isStaff, signOut, user } = useAuth()
  const [copied, setCopied] = useState(false)
  const currentLanguage = languageCode(i18n.language)
  const roleLabel =
    profile?.role === 'super_admin' ? t('menu.roleSuper') : profile?.role === 'main_admin' ? t('menu.roleMain') : profile?.role === 'admin' ? t('menu.roleAdmin') : t('menu.roleCustomer')
  const menuItems = [
    { to: user ? '/account/profile' : '/login', label: t('account.myAccount'), icon: UserRound },
    { to: user ? '/account' : '/login?next=/account', label: t('nav.reservations'), icon: CalendarDays },
    { to: '/favoris', label: t('nav.favorites'), icon: Heart },
    { to: '/properties', label: t('nav.residences'), icon: Home },
    { to: '/cars', label: t('nav.cars'), icon: Car },
    { to: '/properties/map', label: t('nav.map'), icon: MapPin },
    { to: '/contact', label: t('nav.contact'), icon: Phone },
    { to: '/fiche', label: t('account.housing'), icon: FileText },
    { to: '/', label: t('menu.about'), icon: Info },
    ...(isStaff ? [{ to: '/admin', label: t('nav.admin'), icon: Shield }] : []),
  ]

  useEffect(() => {
    if (!open) return
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previous
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', escape)
    return () => window.removeEventListener('keydown', escape)
  }, [open, onClose])

  if (!open) return null

  const tones = ['ih-tone-a', 'ih-tone-b', 'ih-tone-c', 'ih-tone-d', 'ih-tone-e']
  const modes: ('light' | 'dark')[] = ['light', 'dark']

  return createPortal(
    <div className="ih-settings-root fixed inset-0 z-[80]" role="dialog" aria-modal="true" aria-label={t('nav.menu')}>
      <button type="button" className="ih-settings-veil absolute inset-0" aria-label={t('common.cancel')} onClick={onClose} />
      <div className="ih-settings-sheet absolute inset-y-0 start-0 flex h-dvh w-full max-w-md flex-col" style={{ background: 'var(--page)', color: 'var(--page-fg)' }}>
        <div className="ih-settings-hero relative shrink-0 overflow-hidden px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-5">
          <div className="ih-settings-hero-glow" aria-hidden />
          <div className="relative flex items-center gap-3 py-2">
            <p className="min-w-0 flex-1 font-display text-2xl font-medium">{t('menu.title')}</p>
            <button
              type="button"
              className="ih-settings-close grid h-11 w-11 place-items-center rounded-full border border-line bg-[var(--card-bg)] touch-manipulation"
              aria-label={t('common.cancel')}
              onClick={onClose}
            >
              <X size={22} />
            </button>
          </div>
          {user ? (
            <Link to="/account/profile" className="ih-settings-me relative mt-3 flex items-center gap-3 rounded-3xl border border-line bg-[var(--card-bg)]/80 p-3 backdrop-blur" onClick={onClose}>
              <span className="ih-settings-avatar relative grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-full bg-accent-soft text-accent">
                {profile?.avatar_url ? <img src={profile.avatar_url} alt="" className="h-full w-full object-cover" /> : <UserRound className="h-6 w-6" />}
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-1 font-semibold">
                  <span className="truncate">{profile?.full_name || t('account.myAccount')}</span>
                  {admin?.is_verified ? <VerifiedBadge className="h-4 w-4" /> : null}
                </span>
                <span className="mt-0.5 inline-flex rounded-full bg-accent-soft px-2 py-0.5 text-[12px] font-semibold text-accent">{roleLabel}</span>
              </span>
              <ChevronRight className="ih-chevron h-5 w-5 shrink-0 opacity-50 rtl:scale-x-[-1]" />
            </Link>
          ) : null}
        </div>
        <div className="ih-settings-body flex-1 overflow-y-auto px-4 pb-6">
          <div className="ih-set-block">
            <GetAppCard onNavigate={onClose} />
          </div>

          <p className="ih-set-title">{t('menu.appearance')}</p>
          <div className="ih-set-block ih-theme-seg relative grid grid-cols-2 rounded-2xl p-1" style={{ ['--seg' as string]: theme === 'light' ? 0 : 1 }}>
            <span className="ih-theme-pill absolute inset-y-1 start-1 rounded-xl" aria-hidden />
            {modes.map((mode) => (
              <button
                key={mode}
                type="button"
                className={cn('relative z-[1] flex min-h-11 items-center justify-center gap-2 rounded-xl text-sm font-semibold', theme === mode ? '' : 'theme-muted')}
                aria-pressed={theme === mode}
                onClick={() => {
                  if (theme !== mode) toggle()
                }}
              >
                {mode === 'light' ? <Sun className="ih-theme-icon h-4 w-4" /> : <Moon className="ih-theme-icon h-4 w-4" />}
                {mode === 'light' ? t('common.lightMode') : t('common.darkMode')}
              </button>
            ))}
          </div>

          <p className="ih-set-title">{t('common.language')}</p>
          <div className="ih-set-block grid grid-cols-4 gap-1.5">
            {LANGUAGES.map((item, index) => (
              <button
                key={item.code}
                type="button"
                className={cn(
                  'ih-lang-chip flex min-h-12 flex-col items-center justify-center gap-1 rounded-xl border text-[11px] font-semibold uppercase touch-manipulation',
                  item.code === currentLanguage ? 'is-on border-accent-strong bg-accent-strong text-on-accent' : 'border-line bg-[var(--card-bg)] theme-muted',
                )}
                style={{ ['--ih-i' as string]: index }}
                aria-label={item.label}
                aria-pressed={item.code === currentLanguage}
                onClick={() => void i18n.changeLanguage(item.code)}
              >
                <Flag country={item.country} className="h-4" />
                {item.code}
              </button>
            ))}
          </div>

          <p className="ih-set-title">{t('menu.settings')}</p>
          <nav className="flex flex-col gap-2">
            {menuItems.map((item, index) => (
              <Link
                key={item.label}
                to={item.to}
                className="ih-set-row flex min-h-14 items-center gap-3 rounded-2xl border border-line bg-[var(--card-bg)] px-3.5 text-[15px] font-medium"
                style={{ ['--ih-i' as string]: index }}
                onClick={onClose}
              >
                <span className={cn('ih-set-icon grid h-10 w-10 shrink-0 place-items-center rounded-xl', tones[index % tones.length])}>
                  <item.icon className="h-5 w-5" strokeWidth={1.8} />
                </span>
                <span className="min-w-0 flex-1">{item.label}</span>
                <ChevronRight className="ih-chevron h-4 w-4 shrink-0 opacity-40 rtl:scale-x-[-1]" />
              </Link>
            ))}
            <button
              type="button"
              className="ih-set-row flex min-h-14 w-full items-center gap-3 rounded-2xl border border-line bg-[var(--card-bg)] px-3.5 text-left text-[15px] font-medium"
              style={{ ['--ih-i' as string]: menuItems.length }}
              onClick={() =>
                void shareSite().then((result) => {
                  if (result === 'copied') {
                    setCopied(true)
                    window.setTimeout(() => setCopied(false), 2000)
                  }
                })
              }
            >
              <span className="ih-set-icon grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-accent-soft text-accent">
                <Share2 className="h-5 w-5" strokeWidth={1.8} />
              </span>
              <span key={String(copied)} className="ih-pop min-w-0 flex-1">
                {copied ? t('nav.copied') : t('nav.share')}
              </span>
              <ChevronRight className="ih-chevron h-4 w-4 shrink-0 opacity-40 rtl:scale-x-[-1]" />
            </button>
          </nav>
          {user ? <p className="ih-set-title">{t('app.notifications')}</p> : null}
          <AppFeatures />
          <div className="ih-set-block mt-6 flex justify-center">
            <SocialLinks />
          </div>
        </div>
        <div className="shrink-0 border-t border-line px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          {user ? (
            <button
              type="button"
              className="ih-btn flex min-h-12 w-full items-center justify-center gap-2 rounded-full border border-red-200 text-sm font-semibold text-red-700 hover:bg-red-50"
              onClick={() => void signOut()}
            >
              <LogOut className="h-4 w-4" />
              {t('nav.logout')}
            </button>
          ) : (
            <Link to="/login" className="ih-btn ih-btn-primary flex min-h-12 w-full items-center justify-center rounded-full text-sm font-semibold" onClick={onClose}>
              {t('nav.login')}
            </Link>
          )}
        </div>
      </div>
    </div>,
    document.body,
  )
}
