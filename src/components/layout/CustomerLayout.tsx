import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { CalendarDays, ChevronRight, MessageCircle, UserRound } from 'lucide-react'
import { Header } from './Header'
import { PageTransition } from './PageTransition'
import { CustomerNotifications } from '../account/CustomerNotifications'
import { cn } from '../../lib/cn'

export function CustomerLayout() {
  const { t } = useTranslation()
  const { pathname } = useLocation()
  const profilePage = pathname === '/account/profile'
  const chatPage = pathname === '/account/chat'
  const tabs = [
    { to: '/account', label: t('account.title'), icon: CalendarDays, end: true },
    { to: '/account/chat', label: t('account.chat'), icon: MessageCircle, end: false },
    { to: '/account/profile', label: t('account.profile'), icon: UserRound, end: false },
  ]
  const item = ({ isActive }: { isActive: boolean }) =>
    cn(
      'flex min-h-14 items-center gap-3 rounded-2xl px-4 text-sm font-medium touch-manipulation',
      isActive ? 'bg-[#1c1914] text-[#f6f1e8]' : 'border border-[var(--page-fg)]/10 bg-[var(--page-fg)]/6 text-[var(--page-fg)]',
    )

  return (
    <div className="admin-main theme-page min-h-svh">
      <Header />
      {chatPage ? (
        <div className="ih-chat-frame fixed inset-x-0 top-[4.5rem] bottom-[calc(3.5rem+env(safe-area-inset-bottom))] z-30">
          <PageTransition className="h-full">
            <Outlet />
          </PageTransition>
        </div>
      ) : (
      <div className={cn('mx-auto max-w-5xl px-4 pt-28 pb-28', profilePage && 'max-w-lg px-0')}>
        {profilePage ? null : (
          <nav className="mb-6 grid gap-2">
            {tabs.map((tab) => (
              <NavLink key={tab.to} to={tab.to} end={tab.end} className={item}>
                <tab.icon className="h-5 w-5 shrink-0" strokeWidth={1.75} />
                <span className="min-w-0 flex-1">{tab.label}</span>
                <ChevronRight className="h-4 w-4 shrink-0 opacity-60 rtl:scale-x-[-1]" />
              </NavLink>
            ))}
          </nav>
        )}
        {profilePage ? null : <CustomerNotifications />}
        <PageTransition>
          <Outlet />
        </PageTransition>
      </div>
      )}
    </div>
  )
}
