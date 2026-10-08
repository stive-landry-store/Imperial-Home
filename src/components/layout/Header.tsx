import { useEffect, useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Menu, X } from 'lucide-react'
import { cn } from '../../lib/cn'
import { useAuth } from '../../hooks/useAuth'
import { useTheme } from '../../hooks/useTheme'
import { SetupBanner } from './SetupBanner'
import { ImperialLogo } from '../brand/Logo'
import { PreferenceBar } from './PreferenceBar'

export function Header() {
  const { t } = useTranslation()
  const { theme } = useTheme()
  const { profile, isStaff, signOut, user } = useAuth()
  const location = useLocation()
  const [open, setOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const home = location.pathname === '/'

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => setOpen(false), [location.pathname])

  const links = [
    { to: '/properties', label: t('nav.residences') },
    { to: '/cars', label: t('nav.cars') },
    { to: '/contact', label: t('nav.contact') },
  ]

  return (
    <header
      className={cn(
        'fixed inset-x-0 top-0 z-40 transition-colors',
        scrolled || !home || open
          ? 'border-b border-[#d4af6a]/25 text-[var(--header-fg)] backdrop-blur-md'
          : 'bg-transparent text-[#d4af6a]',
      )}
      style={scrolled || !home || open ? { background: 'var(--header-solid)' } : undefined}
    >
      <SetupBanner />
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 md:px-6">
        <Link to="/" className="scale-90 origin-left md:scale-100">
          <ImperialLogo light={theme === 'dark' || (home && !scrolled)} compact={scrolled && home} />
        </Link>
        <div className="flex items-center gap-2 md:hidden">
          <PreferenceBar compact />
          <button
            type="button"
            className="inline-flex min-h-11 min-w-11 items-center justify-center touch-manipulation"
            onClick={() => setOpen((v) => !v)}
            aria-label="Menu"
          >
            {open ? <X /> : <Menu />}
          </button>
        </div>
        <nav className="hidden items-center gap-6 text-[13px] uppercase tracking-[0.2em] md:flex">
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
          <PreferenceBar />
          <Link
            to="/properties"
            className="bg-[#c4a35a] px-4 py-2 text-[13px] tracking-[0.16em] text-black uppercase hover:bg-[#e0c57a]"
          >
            {t('nav.book')}
          </Link>
        </nav>
      </div>
      {open ? (
        <div className="space-y-1 border-t border-gold/20 px-6 py-4 text-base uppercase tracking-[0.16em] md:hidden" style={{ background: 'var(--header-solid)' }}>
          {links.map((l) => (
            <Link key={l.to} to={l.to} className="flex min-h-11 items-center">
              {l.label}
            </Link>
          ))}
          <Link to={user ? '/account' : '/login'} className="flex min-h-11 items-center">
            {user ? t('nav.account') : t('nav.login')}
          </Link>
          {isStaff ? (
            <Link to="/admin" className="flex min-h-11 items-center text-gold-light">
              {t('nav.admin')}
            </Link>
          ) : null}
          <Link to="/properties" className="flex min-h-11 items-center text-[#e0c57a]">
            {t('nav.book')}
          </Link>
          <Link to="/fiche" className="flex min-h-11 items-center">
            {t('account.housing')}
          </Link>
          {user ? (
            <button type="button" className="flex min-h-11 items-center" onClick={() => void signOut()}>
              {t('nav.logout')}
            </button>
          ) : null}
          <p className="normal-case tracking-normal text-[#d4af6a]/60">{profile?.full_name}</p>
          <PreferenceBar />
        </div>
      ) : null}
    </header>
  )
}
