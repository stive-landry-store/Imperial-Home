import { useEffect, useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Menu, X } from 'lucide-react'
import { cn } from '../../lib/cn'
import { shareSite } from '../../lib/social'
import { useAuth } from '../../hooks/useAuth'
import { useTheme } from '../../hooks/useTheme'
import { SetupBanner } from './SetupBanner'
import { ImperialLogo } from '../brand/Logo'
import { PreferenceBar } from './PreferenceBar'
import { SocialLinks } from './SocialLinks'

export function Header() {
  const { t } = useTranslation()
  const { theme } = useTheme()
  const { profile, isStaff, signOut, user } = useAuth()
  const location = useLocation()
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState(false)
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
    { to: '/properties/map', label: t('nav.map') },
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
            <ImperialLogo light={theme === 'dark' || (home && !scrolled)} compact />
          </Link>
        </div>
        <div className="flex items-center gap-2 lg:hidden">
          <PreferenceBar compact />
        </div>
        <nav className="hidden min-w-0 items-center justify-end gap-4 overflow-x-auto text-[12px] uppercase tracking-[0.16em] lg:flex">
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
        <div className="fixed inset-0 z-50">
          <button type="button" className="absolute inset-0 bg-black/65" aria-label={t('common.cancel')} onClick={() => setOpen(false)} />
          <aside
            className="relative flex h-full w-[min(20rem,88vw)] flex-col overflow-y-auto pt-[env(safe-area-inset-top)] text-[var(--header-fg)] shadow-2xl"
            style={{ background: 'var(--header-solid)' }}
          >
            <div className="flex items-center gap-3 px-4 py-4">
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt="" className="h-12 w-12 rounded-full object-cover" />
              ) : null}
              <div className="min-w-0 flex-1">
                <p className="truncate font-display text-xl">{profile?.full_name || t('nav.menu')}</p>
                {profile?.email ? <p className="truncate text-sm normal-case text-[#d4af6a]/70">{profile.email}</p> : null}
              </div>
              <button type="button" className="inline-flex min-h-11 min-w-11 items-center justify-center" aria-label={t('common.cancel')} onClick={() => setOpen(false)}>
                <X />
              </button>
            </div>
            <div className="flex flex-col px-4 pb-8 text-base uppercase tracking-[0.16em]">
              {user ? (
                <Link to="/account/profile" className="flex min-h-11 items-center">
                  {t('account.profile')}
                </Link>
              ) : null}
              {links.map((l) => (
                <Link key={l.to} to={l.to} className="flex min-h-11 items-center">
                  {l.label}
                </Link>
              ))}
              <Link to={user ? '/account' : '/login'} className="flex min-h-11 items-center">
                {user ? t('nav.account') : t('nav.login')}
              </Link>
              {user ? (
                <Link to="/account/chat" className="flex min-h-11 items-center">
                  {t('account.chat')}
                </Link>
              ) : null}
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
              <button
                type="button"
                className="flex min-h-11 items-center text-left"
                onClick={() =>
                  void shareSite().then((result) => {
                    if (result === 'copied') {
                      setCopied(true)
                      window.setTimeout(() => setCopied(false), 2000)
                    }
                  })
                }
              >
                {copied ? t('nav.copied') : t('nav.share')}
              </button>
              {user ? (
                <button type="button" className="flex min-h-11 items-center" onClick={() => void signOut()}>
                  {t('nav.logout')}
                </button>
              ) : null}
              <div className="mt-4 normal-case tracking-normal">
                <SocialLinks />
              </div>
              <div className="mt-4">
                <PreferenceBar />
              </div>
            </div>
          </aside>
        </div>
      ) : null}
    </header>
  )
}
