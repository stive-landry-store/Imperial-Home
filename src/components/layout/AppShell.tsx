import { Outlet, useLocation } from 'react-router-dom'
import { AppTabBar } from './AppTabBar'

export function AppShell() {
  const { pathname } = useLocation()
  const needsRoom = pathname.includes('/fiche')
  return (
    <div className={needsRoom ? 'pb-[calc(3.5rem+env(safe-area-inset-bottom))]' : undefined}>
      <Outlet />
      <AppTabBar />
    </div>
  )
}
