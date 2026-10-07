import { NavLink, Outlet } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Header } from './Header'
import { cn } from '../../lib/cn'

export function CustomerLayout() {
  const { t } = useTranslation()
  const item = ({ isActive }: { isActive: boolean }) =>
    cn('px-3 py-2 text-sm uppercase tracking-[0.14em]', isActive ? 'text-[#d4af6a]' : 'opacity-50 hover:opacity-100')

  return (
    <div className="admin-main theme-page min-h-svh">
      <Header />
      <div className="mx-auto max-w-5xl px-4 pt-28 pb-16">
        <nav className="mb-8 flex flex-wrap gap-2 border-b border-[#d4af6a]/25">
          <NavLink to="/account" end className={item}>
            {t('account.title')}
          </NavLink>
          <NavLink to="/account/chat" className={item}>
            {t('account.chat')}
          </NavLink>
          <NavLink to="/account/profile" className={item}>
            {t('account.profile')}
          </NavLink>
        </nav>
        <Outlet />
      </div>
    </div>
  )
}
