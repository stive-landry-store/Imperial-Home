import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Header } from './Header'
import { AppTabBar } from './AppTabBar'
import { CustomerNotifications } from '../account/CustomerNotifications'
import { cn } from '../../lib/cn'

export function CustomerLayout() {
  const { t } = useTranslation()
  const { pathname } = useLocation()
  const profilePage = pathname === '/account/profile'
  const chatPage = pathname === '/account/chat'
  const item = ({ isActive }: { isActive: boolean }) =>
    cn(
      'inline-flex min-h-11 shrink-0 snap-start items-center px-3 py-2 text-sm font-medium touch-manipulation',
      isActive ? 'text-[#d4af6a]' : 'opacity-50 hover:opacity-100',
    )

  return (
    <div className="admin-main theme-page min-h-svh">
      <Header />
      {chatPage ? (
        <div className="fixed inset-x-0 top-[4.5rem] bottom-[calc(3.5rem+env(safe-area-inset-bottom))] z-30">
          <Outlet />
        </div>
      ) : (
      <div className={cn('mx-auto max-w-5xl px-4 pt-28 pb-28', profilePage && 'max-w-lg px-0')}>
        {profilePage ? null : <nav className="mb-8 flex flex-wrap gap-2 border-b border-[#d4af6a]/25 pb-2">
          <NavLink to="/account" end className={item}>
            {t('account.title')}
          </NavLink>
          <NavLink to="/account/chat" className={item}>
            {t('account.chat')}
          </NavLink>
          <NavLink to="/account/profile" className={item}>
            {t('account.profile')}
          </NavLink>
        </nav>}
        {profilePage ? null : <CustomerNotifications />}
        <Outlet />
      </div>
      )}
      <AppTabBar />
    </div>
  )
}
