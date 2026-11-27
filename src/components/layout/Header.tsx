import { useState, useSyncExternalStore } from 'react'
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ChevronLeft, Menu, X } from 'lucide-react'
import { cn } from '../../lib/cn'
import { useAuth } from '../../hooks/useAuth'
import { useTheme } from '../../hooks/useTheme'
import { SetupBanner } from './SetupBanner'
import { ImperialLogo } from '../brand/Logo'
import { NotificationBell } from './NotificationBell'
import { ThemeSwitch } from './ThemeSwitch'
import { SettingsMenu } from './SettingsMenu'

function subscribeTitle(onChange: () => void) {
  const observer = new MutationObserver(onChange)
  observer.observe(document.head, { childList: true, characterData: true, subtree: true })
  return () => observer.disconnect()
}

const readTitle = () => document.title.split('|')[0].trim()

export function Header() {
  const { t } = useTranslation()
  const { theme } = useTheme()
  const { isStaff, signOut, user } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [openPath, setOpenPath] = useState<string | null>(null)
  const open = openPath === location.pathname
  const setOpen = (value: boolean | ((current: boolean) => boolean)) =>
    setOpenPath((current) => {
      const was = current === location.pathname
      const next = typeof value === 'function' ? value(was) : value
      return next ? location.pathname : null
    })
  const isDetail = /^\/(properties\/(?!map$)[^/]+|cars\/[^/]+|account\/reservations\/[^/]+|compare|contact|favoris)/.test(location.pathname)
  const fallback = location.pathname.startsWith('/cars') ? '/cars' : location.pathname.startsWith('/account') ? '/account' : '/properties'
  function goBack() {
    const index = (window.history.state as { idx?: number } | null)?.idx ?? 0
    if (index > 0) navigate(-1)
    else navigate(fallback)
  }

  const title = useSyncExternalStore(subscribeTitle, readTitle, () => '')

  const links = [
    { to: '/properties', label: t('nav.residences') },
    { to: '/properties/map', label: t('nav.map') },
    { to: '/cars', label: t('nav.cars') },
    { to: '/contact', label: t('nav.contact') },
  ]
  return (
    <header
      className={cn(
        'ih-header fixed inset-x-0 top-0 z-40 border-b border-line text-[var(--header-fg)] backdrop-blur-xl backdrop-saturate-150',
      )}
      style={{ background: 'var(--header-solid)' }}
    >
      <SetupBanner />
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 md:px-6">
        <div className="relative z-10 flex shrink-0 items-center gap-1">
          {isDetail ? (
            <button
              type="button"
              className="inline-flex min-h-11 min-w-9 items-center justify-center touch-manipulation lg:hidden"
              onClick={goBack}
              aria-label={t('common.back')}
            >
              <ChevronLeft className="h-6 w-6 rtl:scale-x-[-1]" />
            </button>
          ) : null}
          <button
            type="button"
            className="inline-flex min-h-11 min-w-11 items-center justify-center touch-manipulation"
            onClick={() => setOpen((value) => !value)}
            aria-label={t('nav.menu')}
            aria-expanded={open}
          >
            {open ? <X /> : <Menu />}
          </button>
          {isDetail && title ? (
            <span className="min-w-0 max-w-[42vw] truncate font-display text-lg tracking-wide lg:hidden">{title}</span>
          ) : null}
          <Link to="/" className={cn('origin-left scale-90', isDetail && title ? 'hidden lg:block' : '')}>
            <ImperialLogo light={theme === 'dark'} compact />
          </Link>
        </div>
        <div className="flex items-center gap-1 lg:hidden">
          <NotificationBell />
          <ThemeSwitch compact />
        </div>
        <nav className="hidden min-w-0 items-center justify-end gap-4 overflow-x-auto text-sm lg:flex">
          {links.map((l) => (
            <NavLink key={l.to} to={l.to} className={({ isActive }) => (isActive ? 'font-semibold text-accent' : 'theme-muted hover:text-accent')}>
              {l.label}
            </NavLink>
          ))}
          {user ? (
            <NavLink to="/account" className={({ isActive }) => (isActive ? 'font-semibold text-accent' : 'theme-muted hover:text-accent')}>
              {t('nav.account')}
            </NavLink>
          ) : (
            <NavLink to="/login" className={({ isActive }) => (isActive ? 'font-semibold text-accent' : 'theme-muted hover:text-accent')}>
              {t('nav.login')}
            </NavLink>
          )}
          {isStaff ? (
            <NavLink to="/admin" className="text-accent">
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
            className="ih-btn ih-btn-primary rounded-full px-5 py-2.5 text-sm font-semibold"
          >
            {t('nav.book')}
          </Link>
        </nav>
        <div className="hidden shrink-0 items-center gap-2 lg:flex">
          <NotificationBell />
          <ThemeSwitch />
        </div>
      </div>
      <SettingsMenu open={open} onClose={() => setOpen(false)} />
    </header>
  )
}
