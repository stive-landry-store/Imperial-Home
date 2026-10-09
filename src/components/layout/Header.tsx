import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
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
      {open
        ? createPortal(
            <div
              className="fixed inset-0 z-[80] flex h-dvh w-full flex-col"
              style={{ background: 'var(--page)', color: 'var(--page-fg)' }}
              role="dialog"
              aria-modal="true"
              aria-label={t('nav.menu')}
            >
              <div className="flex items-center gap-3 px-4 py-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
                {profile?.avatar_url ? (
                  <img src={profile.avatar_url} alt="" className="h-12 w-12 shrink-0 rounded-full object-cover" />
                ) : null}
                <div className="min-w-0 flex-1">
                  <p className="truncate font-display text-2xl">{profile?.full_name || t('nav.menu')}</p>
                  {profile?.email ? <p className="truncate text-sm text-[#d4af6a]/80">{profile.email}</p> : null}
                </div>
                <button
                  type="button"
                  className="inline-flex min-h-12 min-w-12 items-center justify-center touch-manipulation"
                  aria-label={t('common.cancel')}
                  onClick={() => setOpen(false)}
                >
                  <X size={28} />
                </button>
              </div>
              <nav className="grid flex-1 grid-cols-2 content-start gap-2 overflow-y-auto px-4 pb-3">
                {user ? (
                  <Link to="/account/profile" className="menu-choice">
                    {t('account.profile')}
                  </Link>
                ) : null}
                {links.map((item) => (
                  <Link key={item.to} to={item.to} className="menu-choice">
                    {item.label}
                  </Link>
                ))}
                <Link to={user ? '/account' : '/login'} className="menu-choice">
                  {user ? t('nav.account') : t('nav.login')}
                </Link>
                {user ? (
                  <Link to="/account/chat" className="menu-choice">
                    {t('account.chat')}
                  </Link>
                ) : null}
                {isStaff ? (
                  <Link to="/admin" className="menu-choice">
                    {t('nav.admin')}
                  </Link>
                ) : null}
                <Link to="/properties" className="menu-choice">
                  {t('nav.book')}
                </Link>
                <Link to="/fiche" className="menu-choice">
                  {t('account.housing')}
                </Link>
                <button
                  type="button"
                  className="menu-choice"
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
                  <button type="button" className="menu-choice" onClick={() => void signOut()}>
                    {t('nav.logout')}
                  </button>
                ) : null}
              </nav>
              <div className="shrink-0 border-t border-[#d4af6a]/30 px-4 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
                <p className="mb-3 text-center text-sm tracking-[0.22em] text-[#d4af6a] uppercase">{t('nav.networks')}</p>
                <SocialLinks prominent />
                <div className="mt-4 flex justify-center">
                  <PreferenceBar />
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
    </header>
  )
}
