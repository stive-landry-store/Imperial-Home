import { NavLink, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { CalendarDays, Heart, Search, UserRound } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { cn } from '../../lib/cn'

const item =
  'flex min-h-14 min-w-0 flex-1 flex-col items-center justify-center gap-1 px-1 text-[11px] leading-none touch-manipulation'

export function AppTabBar() {
  const { t } = useTranslation()
  const { pathname } = useLocation()
  const { user, profile } = useAuth()
  const accountTo = user ? '/account/profile' : '/login'
  const staysTo = user ? '/account' : '/login?next=/account'
  const searchOn = pathname === '/' || pathname.startsWith('/properties') || pathname.startsWith('/cars')
  const favoritesOn = pathname.startsWith('/favoris')
  const staysOn = pathname === '/account' || pathname.startsWith('/account/reservations')
  const accountOn = pathname.startsWith('/account/profile') || pathname.startsWith('/login') || pathname.startsWith('/register')

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-[45] border-t border-black/10 bg-[var(--header-solid)]"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      aria-label={t('nav.menu')}
    >
      <div className="mx-auto flex max-w-lg">
        <NavLink to="/" className={cn(item, searchOn ? 'font-semibold text-[#c4a35a]' : 'theme-muted')}>
          <Search className="h-6 w-6" strokeWidth={searchOn ? 2.25 : 1.75} />
          <span>{t('nav.search')}</span>
        </NavLink>
        <NavLink to="/favoris" className={cn(item, favoritesOn ? 'font-semibold text-[#c4a35a]' : 'theme-muted')}>
          <Heart className="h-6 w-6" strokeWidth={favoritesOn ? 2.25 : 1.75} />
          <span>{t('nav.favorites')}</span>
        </NavLink>
        <NavLink to={staysTo} end={Boolean(user)} className={cn(item, staysOn ? 'font-semibold text-[#c4a35a]' : 'theme-muted')}>
          <CalendarDays className="h-6 w-6" strokeWidth={staysOn ? 2.25 : 1.75} />
          <span>{t('nav.reservations')}</span>
        </NavLink>
        <NavLink to={accountTo} className={cn(item, accountOn ? 'font-semibold text-[#c4a35a]' : 'theme-muted')}>
          {profile?.avatar_url ? (
            <img src={profile.avatar_url} alt="" className="h-6 w-6 rounded-full object-cover" />
          ) : (
            <UserRound className="h-6 w-6" strokeWidth={1.75} />
          )}
          <span>{t('account.myAccount')}</span>
        </NavLink>
      </div>
    </nav>
  )
}
