import { useEffect, useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Menu, X } from 'lucide-react'
import { cn } from '../../lib/cn'
import { useAuth } from '../../hooks/useAuth'
import { useTheme } from '../../hooks/useTheme'
import { SetupBanner } from './SetupBanner'
import { ImperialLogo } from '../brand/Logo'
import { NotificationBell } from './NotificationBell'
import { ThemeSwitch } from './ThemeSwitch'
import { ProfileMenu } from '../account/ProfileMenu'
import { SettingsMenu } from './SettingsMenu'

export function Header() {
  const { t } = useTranslation()
  const { theme } = useTheme()
  const { isStaff, signOut, user } = useAuth()
  const location = useLocation()
  const [open, setOpen] = useState(false)
  const profileMenu = location.pathname === '/account/profile'

  useEffect(() => setOpen(false), [location.pathname])

  const links = [
    { to: '/properties', label: t('nav.residences') },
    { to: '/properties/map', label: t('nav.map') },
    { to: '/cars', label: t('nav.cars') },
    { to: '/contact', label: t('nav.contact') },
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
      {profileMenu ? <ProfileMenu open={open} onClose={() => setOpen(false)} /> : <SettingsMenu open={open} onClose={() => setOpen(false)} />}
    </header>
  )
}
