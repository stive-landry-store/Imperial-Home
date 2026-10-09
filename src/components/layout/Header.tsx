import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { CalendarDays, Car, FileText, Heart, Home, Info, LogOut, MapPin, Menu, Phone, Share2, UserRound, X } from 'lucide-react'
import { cn } from '../../lib/cn'
import { LANGUAGES, languageCode } from '../../lib/languages'
import { shareSite } from '../../lib/social'
import { VerifiedBadge } from '../ui/VerifiedBadge'
import { useAuth } from '../../hooks/useAuth'
import { useTheme } from '../../hooks/useTheme'
import { SetupBanner } from './SetupBanner'
import { ImperialLogo } from '../brand/Logo'
import { NotificationBell } from './NotificationBell'
import { ThemeSwitch } from './ThemeSwitch'
import { SocialLinks } from './SocialLinks'
import { ProfileMenu } from '../account/ProfileMenu'

export function Header() {
  const { t, i18n } = useTranslation()
  const { theme, toggle } = useTheme()
  const { profile, admin, isStaff, signOut, user } = useAuth()
  const location = useLocation()
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const profileMenu = location.pathname === '/account/profile'

  useEffect(() => setOpen(false), [location.pathname])

  useEffect(() => {
    if (!open) return
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previous
    }
  }, [open])

  const links = [
    { to: '/properties', label: t('nav.residences') },
    { to: '/properties/map', label: t('nav.map') },
    { to: '/cars', label: t('nav.cars') },
    { to: '/contact', label: t('nav.contact') },
  ]
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

  return (
    <header
      className={cn(
        'fixed inset-x-0 top-0 z-40 border-b border-black/10 text-[var(--header-fg)] backdrop-blur-md',
      )}
      style={{ background: 'var(--header-solid)' }}
    >
      <SetupBanner />
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 md:px-6">
        <div className="relative z-10 flex shrink-0 items-center gap-1">
          <button
            type="button"
            className="inline-flex min-h-11 min-w-11 items-center justify-center touch-manipulation"
            onClick={() => setOpen((value) => !value)}
            aria-label={t('nav.menu')}
            aria-expanded={open}
          >
            {open ? <X /> : <Menu />}
          </button>
          <Link to="/" className="origin-left scale-90">
            <ImperialLogo light={theme === 'dark'} compact />
          </Link>
        </div>
        <div className="flex items-center gap-1 lg:hidden">
          <NotificationBell />
          <ThemeSwitch compact />
        </div>
        <nav className="hidden min-w-0 items-center justify-end gap-4 overflow-x-auto text-sm lg:flex">
          {links.map((l) => (
            <NavLink key={l.to} to={l.to} className={({ isActive }) => (isActive ? 'text-gold-light' : 'hover:text-gold-light')}>
              {l.label}
            </NavLink>
          ))}
          {user ? (
            <NavLink to="/account" className={({ isActive }) => (isActive ? 'text-gold-light' : 'hover:text-gold-light')}>
              {t('nav.account')}
            </NavLink>
          ) : (
            <NavLink to="/login" className={({ isActive }) => (isActive ? 'text-gold-light' : 'hover:text-gold-light')}>
              {t('nav.login')}
            </NavLink>
          )}
          {isStaff ? (
            <NavLink to="/admin" className="text-gold-light">
              {t('nav.admin')}
            </NavLink>
          ) : null}
          {user ? (
            <button type="button" onClick={() => void signOut()}>
              {t('nav.logout')}
            </button>
          ) : null}
          <Link
            to="/properties"
            className="bg-[#c4a35a] px-4 py-2 text-[13px] tracking-[0.16em] text-black uppercase hover:bg-[#e0c57a]"
          >
            {t('nav.book')}
          </Link>
        </nav>
        <div className="hidden shrink-0 items-center gap-2 lg:flex">
          <NotificationBell />
          <ThemeSwitch />
        </div>
      </div>
      {open && profileMenu ? <ProfileMenu open onClose={() => setOpen(false)} /> : null}
      {open && !profileMenu
        ? createPortal(
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
                  onClick={() => setOpen(false)}
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
                    <Link key={item.label} to={item.to} className="flex min-h-12 items-center gap-3 text-base">
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
                    <Link to="/admin" className="mt-1 flex min-h-12 items-center text-base font-semibold text-[#c4a35a]">
                      {t('nav.admin')}
                    </Link>
                  </>
                ) : null}
                <div className="mt-4">
                  <SocialLinks />
                </div>
              </div>
              <div className="shrink-0 border-t border-black/10 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
                {user ? (
                  <>
                    <Link to="/account/profile" className="flex items-center gap-3">
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
                  >
                    {t('nav.login')}
                  </Link>
                )}
              </div>
            </div>,
            document.body,
          )
        : null}
    </header>
  )
}
